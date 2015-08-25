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

export default function ({ Plugin, types:t }){
  return new Plugin("xvdom", {
    visitor: {
      JSXOpeningElement: {
        exit(node/*, parent, scope, file */){
          return t.objectExpression([
            objectProperty(t, "el", t.literal(node.name.name)),
            ...(
              !node.attributes.length ? [] : [
                objectProperty(t, "props",
                  t.objectExpression(
                    node.attributes.reduce((objectProps, attr)=>{
                      const propValue = transformProp(t, attr.value);
                      if(propValue){
                        objectProps.push(objectProperty(t, attr.name.name, propValue));
                      }
                      return objectProps;
                    }, [])
                  )
                )
              ]
            )
          ]);
        }
      },

      JSXClosingElement: {
        exit(){ return this.dangerouslyRemove(); }
      },

      JSXElement: {
        exit(node){
          const children = buildChildren(t, node.children);
          const values   = [];
          let i          = node.openingElement.properties.length;
          let elementProp, elProp;

          while(--i){
            elProp = node.openingElement.properties[i];
            if(elProp.key.name === "props"){
              elementProp = elProp;
              break;
            }
          }

          // props dynamic props
          if(elementProp){
            const props = elementProp.value.properties;
            props.forEach(prop=>{
              if(isDynamic(t, prop.value)){
                values.push(prop.value);
                prop.key   = t.identifier(`${prop.key.name}$`);
                prop.value = t.literal(values.length - 1);
              }
            });
          }

          // Process dynamic children
          if(children.length){
            node.openingElement.properties.push(
              t.property(
                "init",
                t.identifier("children"),
                t.arrayExpression(children.map(child=>
                  isDynamic(t, child) ? (values.push(child), t.literal(values.length - 1))
                    : child
                ))
              )
            );
          }

          // If there were any dynamic props or children, create a dynamic vnode
          if(values.length){
            return t.objectExpression([
              objectProperty(t, "node",     t.identifier("null")),
              objectProperty(t, "template", node.openingElement),
              objectProperty(t, "values",   t.arrayExpression(values))
            ]);
          }

          return node.openingElement;
        }
      }
    }
  });
}
