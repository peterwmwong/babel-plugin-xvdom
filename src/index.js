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

function createRenderFunction(t, {el, hasDynamics}){
  const params = hasDynamics ? [t.identifier("inst")] : [];
  return t.functionExpression(null, params,
    t.blockStatement([
      t.returnStatement(
        t.callExpression(
          t.memberExpression(t.identifier("document"), t.identifier("createElement")),
          [t.literal(el)]
        )
      )
    ])
  );
}

function createInstanceObject(t, desc){
  return t.objectExpression([
    objectProperty(t, "spec",
      t.objectExpression([
        objectProperty(t, "render", createRenderFunction(t, desc))
      ])
    ),

    objectProperty(t, "_node", t.identifier("null"))
  ]);
}

export default function ({ Plugin, types:t }){
  return new Plugin("xvdom", {
    visitor: {
      JSXOpeningElement: {
        exit(node/*, parent, scope, file */){
          node.__xvdom_desc = {
            el: node.name.name,
            props: {},
            hasDynamics: false
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
