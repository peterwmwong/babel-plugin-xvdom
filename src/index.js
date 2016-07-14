//TODO(design): conditionally including globals (createDynamic, createDynamic, createComponent)
//TODO(design): More specific xvdom AST node information (element, component, w/dynamic-props? etc.)
//                - There is waaayyyy to many arguments being passed between the create*Code functions
//                - Need an abstraction to group all relevant information necessary for the code generating functions
import {
  buildChildren,
  toReference
} from './helpers';

const BYTECODE = {
  el        : 0,
  component : 1,
  dynamic   : 2,
  static    : 3,
  child     : 4,
  parent    : 5
};

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

function isComponentName(name){ return name && /^[A-Z]/.test(name); }

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

const STATIC_BYTECODES = [BYTECODE.static];
function staticBytecode(t, s, staticsAcc){
  staticsAcc.push(s.node);
  return STATIC_BYTECODES;
}

const DYNAMIC_BYTECODES = [BYTECODE.dynamic];
function dynamicBytecode(t, d, dynamicsAcc){
  dynamicsAcc.push(d.node);
  return DYNAMIC_BYTECODES;
}

function elChildBytecode(t, child, staticsAcc, dynamicsAcc){
  switch (child.type){
  case 'el':      return elBytecode(t, child, staticsAcc, dynamicsAcc);
  case 'static':  return staticBytecode(t, child, staticsAcc);
  case 'dynamic': return dynamicBytecode(t, child, dynamicsAcc);
  default: throw 'unknown child type';
  }
}

function elChildrenBytecode(t, children, staticsAcc, dynamicsAcc){
  return (
    children && children.length
      ? [
        BYTECODE.child,
        ...children.reduce((acc, child)=> {
          return acc.concat(elChildBytecode(t, child, staticsAcc, dynamicsAcc))
        }, []),
        BYTECODE.parent
      ]
      : []
  );
}

function propBytecode(t, props, staticProps, staticsAcc, dynamicsAcc){
  const numProps = props ? props.length : 0;
  if(numProps === 0) return [numProps];

  props.forEach(({isDynamic, name, value})=> {
    staticsAcc.push(t.stringLiteral(name));
    (isDynamic ? dynamicsAcc : staticsAcc).push(value);
  }, []);

  return [numProps, staticProps];
}

function elBytecode(t, {el, props, staticProps, children}, staticsAcc, dynamicsAcc){
  return [
    BYTECODE.el, TAG_TO_REF[el],
      ...propBytecode(t, props, staticProps, staticsAcc, dynamicsAcc),
      ...elChildrenBytecode(t, children, staticsAcc, dynamicsAcc)
  ];
}

function trimPops(t, bytecode){
  let code;
  while(bytecode.length && (code = bytecode.pop()) === BYTECODE.parent);
  bytecode.push(code);
  return bytecode;
}

function specBytecode(t, desc, staticsAcc, dynamicsAcc){
  return t.arrayExpression(
    trimPops(t,
      elBytecode(t, desc, staticsAcc, dynamicsAcc)
    ).map((code)=> t.numericLiteral(code))
  );
}

function createSpecBytecodeStaticArrays(t, desc){
  const staticsAcc = [];
  const dynamicsAcc = [];
  const bytecode = specBytecode(t, desc, staticsAcc, dynamicsAcc);

  return {
    bytecode,
    statics:  t.arrayExpression(staticsAcc),
    dynamics: t.arrayExpression(dynamicsAcc)
  };
}

function createSpecObject(t, file, desc){
  const id = file.scope.generateUidIdentifier('xvdomSpec');
  const {bytecode, statics, dynamics} = createSpecBytecodeStaticArrays(t, desc);

  file.path.unshiftContainer('body',
    t.variableDeclaration('var', [
      t.variableDeclarator(id,
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
          let staticProps = 0;
          const props = attributes.length && attributes.reduce(
            (props, attr)=> {
              const propName = attr.name.name;
              const value    = transformProp(t, attr.value);
              let _isDynamic  = false;

              if(propName === 'key'){
                key = value;
              }
              else if(propName === 'recycle'){
                recycle = true;
              }
              else if(value != null){
                if(!(_isDynamic = isDynamic(t, value))) staticProps++;
                props.push({
                  isDynamic: _isDynamic,
                  name: propName,
                  value: value
                });
              }

              return props;
            },
            []
          );

          node.__xvdom_desc = {
            type: 'el',
            key,
            recycle,
            props,
            staticProps,
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
