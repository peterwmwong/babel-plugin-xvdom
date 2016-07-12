//TODO(design): conditionally including globals (createDynamic, createDynamic, createComponent)
//TODO(design): More specific xvdom AST node information (element, component, w/dynamic-props? etc.)
//                - There is waaayyyy to many arguments being passed between the create*Code functions
//                - Need an abstraction to group all relevant information necessary for the code generating functions
import {
  buildChildren,
  toReference
} from './helpers';

const REF_TO_TAG = [
  'a',
  'b',
  'div',
  'i',
  'input',
  'span'
];

const TAG_TO_REF = REF_TO_TAG.reduce(
  (acc, tag, i)=> (
    (acc[tag] = i),
    acc
  ),
  {}
);

function isComponentName(name){
  return name && /^[A-Z]/.test(name);
}

function isDynamic(t, astNode){
  if(t.isLiteral(astNode)){
    return false;
  }
  else if(t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)){
    return isDynamic(t, astNode.left) || isDynamic(t, astNode.right);
  }
  else if(t.isUnaryExpression(astNode)){
    return isDynamic(t, astNode.argument);
  }
  return true;
}

function objProp(t, key, value){
  return t.objectProperty(
    (t.isIdentifier(key) ? key : t.identifier(key)),
    value
  );
}

function objProps(t, keyValues){
  return Object.keys(keyValues).map((key)=> objProp(t, key, keyValues[key]));
}

function obj(t, keyValues){
  return t.objectExpression(objProps(t, keyValues));
}

function transformProp(t, prop){
  return (
      t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression)
    : t.isJSXEmptyExpression(prop)     ? null
    : (t.isIdentifier(prop)
        || t.isMemberExpression(prop)) ? toReference(t, prop)
    : prop == null                     ? t.booleanLiteral(true)
    : prop
  );
}

function staticBytecode(t, s, staticsAcc){
  const i = staticsAcc.push(s.node);
  return [5, i - 1];
}

function dynamicBytecode(t, d, dynamicsAcc){
  const i = dynamicsAcc.push(d.node);
  return [4, i - 1];
}

function elChildBytecode(t, child, staticsAcc, dynamicsAcc){
  switch (child.type){
  case 'el':      return elCode(t, child, staticsAcc, dynamicsAcc);
  case 'static':  return staticBytecode(t, child, staticsAcc);
  case 'dynamic': return dynamicBytecode(t, child, dynamicsAcc);
  default: throw 'unknown child type';
  }
}

function elChildrenBytecode(t, children, staticsAcc, dynamicsAcc){
  const result = (
    children && children.length
      ? [
        6,
        ...children.reduce((acc, child)=> {
          return acc.concat(elChildBytecode(t, child, staticsAcc, dynamicsAcc))
        }, []),
        7
      ]
      : []
  );
  return result;
}

const propBytecode = (t, {dynamics=[], statics=[]}, staticsAcc, dynamicsAcc)=> {
  const numProps = dynamics.length + statics.length;
  const staticProps = numProps > 0 ? [statics.length] : [];
  return [
    numProps,
    ...staticProps,
    ...dynamics.map((s)=> dynamicsAcc.push(s.value) - 1),
    ...statics.map( (s)=> staticsAcc.push(s.value)  - 1)
  ]
};

function elCode(t, {el, props, children}, staticsAcc, dynamicsAcc){
  return [
    (props.length ? 0 : 1),
    TAG_TO_REF[el],
    ...propBytecode(t, props, staticsAcc, dynamicsAcc),
    ...elChildrenBytecode(t, children, staticsAcc, dynamicsAcc)
  ];
}

function trimPops(t, bytecode){
  let code;
  while(bytecode.length && t.isNumericLiteral(code = bytecode.pop()) && code.value === 7);
  bytecode.push(code);
  return bytecode;
}

function specBytecode(t, desc, staticsAcc, dynamicsAcc){
  return t.arrayExpression(
    trimPops(t,
      elCode(t, desc, staticsAcc, dynamicsAcc)
        .map((code)=> t.numericLiteral(code)
      )
    )
  );
}

function createSpecBytecodeStaticArrays(t, desc){
  const staticsAcc = [];
  const dynamicsAcc = [];
  const bytecode = specBytecode(t, desc, staticsAcc, dynamicsAcc);

  return {
    bytecode,
    statics: t.arrayExpression(staticsAcc),
    dynamics: t.arrayExpression(dynamicsAcc)
  };
}

function createSpecObject(t, file, desc){
  const id = file.scope.generateUidIdentifier('xvdomSpec');
  const {bytecode, statics, dynamics} = createSpecBytecodeStaticArrays(t, desc);

  file.path.unshiftContainer('body',
    t.variableDeclaration('var', [
      t.variableDeclarator(
        id,
        obj(t, {
          b: bytecode,
          s: statics
        })
      )
    ])
  );

  return {id, dynamics};
}

function xcreateInstanceObject(t, file, desc){
  const {id, dynamics} = createSpecObject(t, file, desc);
  return obj(t, {
    t: id,
    d: dynamics
  });
}

export default function({types: t}){
  return {
    visitor: {
      JSXOpeningElement: {
        exit({node, node:{attributes}}/*, parent, scope, file */){
          let key;
          let recycle = false;
          const props = attributes.length && attributes.reduce(
            (props, attr)=> {
              const propName = attr.name.name;
              const value    = transformProp(t, attr.value);

              if(propName === 'key'){
                key = value;
              }
              else if(propName === 'recycle'){
                recycle = true;
              }
              else if(value != null){
                props[isDynamic(t, value) ? 'dynamics' : 'statics'].push({
                  name: propName,
                  value: value
                })
              }

              return props;
            },
            {dynamics:[], statics:[]}
          );

          node.__xvdom_desc = {
            type: 'el',
            key,
            recycle,
            props,
            el: node.name.name
          };
        }
      },

      JSXElement: {
        exit(path, state){
          const node     = path.node;
          const desc     = node.__xvdom_desc = node.openingElement.__xvdom_desc;
          desc.children  = buildChildren(t, node.children).map((child)=>
            child.__xvdom_desc || {
              type: isDynamic(t, child) ? 'dynamic' : 'static',
              node: child
            }
          );

          if(!t.isJSX(path.parent)){
            path.replaceWith(xcreateInstanceObject(t, state.file, desc));
          }
        }
      }
    }
  };
}
