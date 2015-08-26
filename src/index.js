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

function getVNodeProperty(t, vnode, propName){
  let prop;
  for(let i=0; i<vnode.properties.length; ++i){
    prop = vnode.properties[i];
    if(prop.key.name === propName){
      return prop;
    }
  }
}

export default function ({ Plugin, types:t }){
  return new Plugin("xvdom", {
    visitor: {
      JSXOpeningElement: {
        exit(node/*, parent, scope, file */){
          const dynamicValueProps = [];
          const result = t.objectExpression([
            objectProperty(t, "el", t.literal(node.name.name)),
            ...(
              !node.attributes.length ? [] : [
                objectProperty(t, "props",
                  t.objectExpression(
                    node.attributes.reduce((objectProps, attr)=>{
                      let propValue = transformProp(t, attr.value);
                      if(propValue){
                        let propName = attr.name.name;
                        if(isDynamic(t, propValue)){
                          dynamicValueProps.push({
                            value: propValue,
                            ref: propValue = t.literal(dynamicValueProps.length)
                          });
                          propName = `$${propName}`;
                        }
                        objectProps.push(objectProperty(t, propName, propValue));
                      }
                      return objectProps;
                    }, [])
                  )
                )
              ]
            )
          ]);
          result.__xvdom_dynamicValueProps = dynamicValueProps;
          return result;
        }
      },

      JSXClosingElement: {
        exit(){ return this.dangerouslyRemove(); }
      },

      JSXElement: {
        exit(node, parent){
          const children = buildChildren(t, node.children);
          let values     = node.openingElement.__xvdom_dynamicValueProps || [];

          // Process dynamic children
          if(children.length){
            node.openingElement.properties.push(
              t.property(
                "init",
                t.identifier("children"),
                t.arrayExpression(children.map(child=>{
                  if(isDynamic(t, child)){
                    const valueRef = t.literal(values.length);
                    values.push({
                      value: child,
                      ref: valueRef
                    });
                    return valueRef;
                  }
                  else if(child.__xvdom_dynamicValues){
                    child.__xvdom_dynamicValues.forEach(function({ref, value}){
                      ref.value = values.length;
                      values.push({ref, value});
                    });
                    return getVNodeProperty(t, child, "template").value;
                  }
                  else{
                    return child;

                  }
                }))
              )
            );
          }

          // If there were any dynamic props or children, create a dynamic vnode
          if(values.length || !t.isJSXElement(parent)){
            const rootObjectProperties = [
              objectProperty(t, "node",     t.identifier("null")),
              objectProperty(t, "template", node.openingElement)
            ];
            if(values.length){
              rootObjectProperties.push(
                objectProperty(t, "values",
                  t.arrayExpression(values.map(valueRef=>valueRef.value))
                )
              );
            }
            const result = t.objectExpression(rootObjectProperties);
            result.__xvdom_dynamicValues = values;
            return result;
          }

          return node.openingElement;
        }
      }
    }
  });
}
