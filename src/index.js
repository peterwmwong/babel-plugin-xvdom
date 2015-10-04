import {
  buildChildren,
  toReference
} from "./helpers";

function isDynamic(t, astNode){
  return t.isIdentifier(astNode)
          || t.isBinaryExpression(astNode)
          || t.isCallExpression(astNode);
}

function objectProperty(t, key, value){
  return t.property("init", t.identifier(key), value);
}

function transformProp(t, prop){
  return (
      t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression)
    : t.isJSXEmptyExpression(prop)     ? null
    : (t.isIdentifier(prop)
        || t.isMemberExpression(prop)) ? toReference(t, prop)
    : prop
  );
}

function createPropsSeqExprs(t, props){
  return Object.keys(props).map(prop=>
    t.assignmentExpression("=",
      t.memberExpression(t.identifier("node"), t.identifier(prop)),
      props[prop]
    )
  );
}

function createElementCode(t, el, props){
  const hasProps = props && Object.keys(props).length;
  const createEl =  t.callExpression(
    t.memberExpression(t.identifier("document"), t.identifier("createElement")),
    [t.literal(el)]
  );

  if(hasProps){
    return t.sequenceExpression([
      t.assignmentExpression("=", t.identifier("node"), createEl),
      ...createPropsSeqExprs(t, props),
      t.identifier("node")
    ]);
  }
  else{
    return createEl;
  }
}

function createRenderFunction(t, {el, props, hasDynamics}){
  const params = hasDynamics ? [t.identifier("inst")] : [];
  const hasProps = props && Object.keys(props).length;
  const body = hasProps ?
      t.blockStatement([
        t.variableDeclaration("var", [
          t.variableDeclarator(t.identifier("node")),
          t.variableDeclarator(t.identifier("root"),
            createElementCode(t, el, props)
          )
        ]),
        t.returnStatement(
          t.identifier("root")
        )
      ])
    : t.blockStatement([
        t.returnStatement(
          createElementCode(t, el, props)
        )
      ]);
  return t.functionExpression(null, params, body);
}

function createInstanceObject(t, desc){
  const objectProps = [
    objectProperty(t, "spec",
      t.objectExpression([
        objectProperty(t, "render", createRenderFunction(t, desc))
      ])
    ),

    objectProperty(t, "_node", t.identifier("null"))
  ];

  if(desc.key) objectProps.push(objectProperty(t, "key", desc.key));

  return t.objectExpression(objectProps);
}

export default function ({ Plugin, types:t }){
  return new Plugin("xvdom", {
    visitor: {
      JSXOpeningElement: {
        exit(node/*, parent, scope, file */){
          let key;
          const props = node.attributes.length && node.attributes.reduce((props, attr)=>{
            const propName = attr.name.name;
            const value    = transformProp(t, attr.value);

            if(propName === "key") key = value;
            else props[propName] = value;

            return props;
          }, {});

          node.__xvdom_desc = {
            hasDynamics: false,
            el: node.name.name,
            props,
            key
          };
          return node;
        }
      },

      JSXClosingElement: {
        exit(){ return this.dangerouslyRemove(); }
      },

      JSXElement: {
        exit(node, parent){
          return createInstanceObject(t, node.openingElement.__xvdom_desc);
        }
      }
    }
  });
}
