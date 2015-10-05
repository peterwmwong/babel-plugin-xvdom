import {
  buildChildren,
  toReference
} from "./helpers";

// function isDynamic(t, astNode){
//   return t.isIdentifier(astNode)
//           || t.isBinaryExpression(astNode)
//           || t.isCallExpression(astNode);
// }

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

function createPropsStatements(t, nodeId, props){
  if(!props) return [];
  return Object.keys(props).map(prop=>
    t.expressionStatement(
      t.assignmentExpression("=",
        t.memberExpression(nodeId, t.identifier(prop)),
        props[prop]
      )
    )
  );
}

function createElementsCode(t, generateUidIdentifier, parentId, children){
  const result = {variableDeclarators:[], statements:[]};
  if(!children) return result;

  let tmpNodeId;
  return children.reduce(
    (acc, {el, props, children})=>{
      const hasProps    = props    && Object.keys(props).length;
      const hasChildren = children && children.length;
      let   createEl    = t.callExpression(
        t.memberExpression(t.identifier("document"), t.identifier("createElement")),
        [t.literal(el)]
      );

      if(hasProps || hasChildren){
        if(!tmpNodeId){
          tmpNodeId = generateUidIdentifier();
          acc.variableDeclarators.push(tmpNodeId);
        }

        acc.statements.push(
          t.expressionStatement(t.assignmentExpression("=", tmpNodeId, createEl))
        );
        createEl = tmpNodeId;

        if(hasProps) acc.statements.push(...createPropsStatements(t, tmpNodeId, props));

        if(hasChildren){
          const {
            variableDeclarators,
            statements
          } = createElementsCode(t, generateUidIdentifier, tmpNodeId, children);

          acc.variableDeclarators.push(...variableDeclarators);
          acc.statements.push(...statements);
        }
      }

      acc.statements.push(
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(parentId, t.identifier("appendChild")),
            [createEl]
          )
        )
      );
      return acc;
    },
    result
  );
}

function createRootElementCode(t, generateUidIdentifier, {el, props, children}){
  const nodeId   = generateUidIdentifier();
  const createEl = t.callExpression(
    t.memberExpression(t.identifier("document"), t.identifier("createElement")),
    [t.literal(el)]
  );
  const {
    variableDeclarators,
    statements
  } = createElementsCode(t, generateUidIdentifier, nodeId, children);

  return {
    variableDeclarators: [
      t.variableDeclarator(nodeId, createEl),
      ...variableDeclarators
    ],
    statements: [
      ...createPropsStatements(t, nodeId, props),
      ...statements
    ]
  };
}

function createRenderFunction(t, scope, rootElement){
  let lastUidInt = 1;
  function generateUidIdentifier(){
    const id = (lastUidInt === 1) ? "_n" : `_n${lastUidInt}`;
    ++lastUidInt;
    return t.identifier(id);
  }
  const params                            = rootElement.hasDynamics ? [t.identifier("inst")] : [];
  const {variableDeclarators, statements} = createRootElementCode(t, generateUidIdentifier, rootElement);

  return t.functionExpression(null, params, t.blockStatement([
    t.variableDeclaration("var", variableDeclarators),
    ...statements,
    t.returnStatement(variableDeclarators[0].id)
  ]));
}

function createInstanceObject(t, scope, desc){
  const objectProps = [
    objectProperty(t, "spec",
      t.objectExpression([
        objectProperty(t, "render", createRenderFunction(t, scope, desc))
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
        exit(node, parent, scope){
          const children = buildChildren(t, node.children);
          const desc     = node.openingElement.__xvdom_desc;
          desc.children = children.map(c=>c.openingElement && c.openingElement.__xvdom_desc);

          if(t.isJSX(parent)) return node;
          return createInstanceObject(t, scope, node.openingElement.__xvdom_desc);
        }
      }
    }
  });
}
