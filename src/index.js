import {
  buildChildren,
  toReference
} from './helpers';

const BYTECODE_EL               = 0;
const BYTECODE_COMPONENT        = 1;
const BYTECODE_DYNAMIC          = 2;
const BYTECODE_STATIC           = 3;
const BYTECODE_CHILD            = 4;
const BYTECODE_PARENT           = 5;
const BYTECODE_PUSH_CONTEXTNODE = 6;

const RERENDER_BYTECODE_ELPROP  = 0;
const RERENDER_BYTECODE_CHILD   = 1;

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

const STATIC_BYTECODES = [BYTECODE_STATIC];
function staticBytecode(t, s, {staticsAcc}){
  staticsAcc.push(s.node);
  return STATIC_BYTECODES;
}

const DYNAMIC_BYTECODES = [BYTECODE_DYNAMIC];
function dynamicBytecode(t, d, {dynamicsAcc, updateAcc}){
  dynamicsAcc.push(d.node);
  updateAcc.push(
    t.numericLiteral(RERENDER_BYTECODE_CHILD),
    t.numericLiteral(d.parent.contextNodeOffset)
  );
  return DYNAMIC_BYTECODES;
}

function elChildBytecode(t, child, context){
  switch (child.type){
  case 'el':      return elBytecode(t, child, context);
  case 'static':  return staticBytecode(t, child, context);
  case 'dynamic': return dynamicBytecode(t, child, context);
  default: throw 'unknown child type';
  }
}

function elChildrenBytecode(t, children, context){
  return (
    children && children.length
      ? [
        BYTECODE_CHILD,
        ...children.reduce((acc, child)=> {
          return acc.concat(elChildBytecode(t, child, context))
        }, []),
        BYTECODE_PARENT
      ]
      : []
  );
}

function propBytecode(t, props, staticProps, {staticsAcc, dynamicsAcc, updateAcc}){
  const numProps = props ? props.length : 0;
  if(numProps === 0) return [numProps];

  props.forEach(({isDynamic, name, value})=> {
    const nameOffset = staticsAcc.push(t.stringLiteral(name)) - 1;
    if(isDynamic){
      dynamicsAcc.push(value);
      updateAcc.push(
        t.numericLiteral(RERENDER_BYTECODE_ELPROP),
        t.numericLiteral(nameOffset << 16)
      );
    }
    else{
      staticsAcc.push(value);
    }
  }, []);

  return [numProps, staticProps];
}

function componentPropBytecode(t, props, staticProps, {staticsAcc, dynamicsAcc}){
  const numProps = props ? props.length : 0;
  if(numProps === 0) return [numProps];

  props.forEach(({isDynamic, name, value})=> {
    staticsAcc.push(t.stringLiteral(name));
    (isDynamic ? dynamicsAcc : staticsAcc).push(value);
  }, []);

  return [numProps, staticProps];
}

function elBytecode(t, desc, context){
  const {
    el, props, staticProps, children, hasDynamicProps, hasDynamicChildren
  } = desc;
  const willPushContextNode = hasDynamicProps || hasDynamicChildren;

  if(willPushContextNode) desc.contextNodeOffset = context.contextNodeOffset++

  return [
    BYTECODE_EL,
    TAG_TO_REF[el],
    ...propBytecode(t, props, staticProps, context),
    ...(willPushContextNode ? [BYTECODE_PUSH_CONTEXTNODE] : []),
    ...elChildrenBytecode(t, children, context)
  ];
}

function componentBytecode(t, {el, props, staticProps}, context){
  context.staticsAcc.push(t.identifier(el));
  return [
    BYTECODE_COMPONENT,
    ...componentPropBytecode(t, props, staticProps, context)
  ];
}

function trimPops(t, bytecode){
  let code;
  while(bytecode.length && (code = bytecode.pop()) === BYTECODE_PARENT);
  bytecode.push(code);
  return bytecode;
}

function specBytecode(t, root, context){
  return t.arrayExpression(
    trimPops(t,
      (root.type === 'el' ? elBytecode : componentBytecode)(t, root, context)
    ).map((code)=> t.numericLiteral(code))
  );
}

function createSpecBytecodeStaticArrays(t, desc){
  const context = {
    staticsAcc  : [],
    dynamicsAcc : [],
    updateAcc   : [],
    contextNodeOffset: 0
  };
  const bytecode = specBytecode(t, desc, context);

  return {
    bytecode,
    statics:  t.arrayExpression(context.staticsAcc),
    dynamics: t.arrayExpression(context.dynamicsAcc),
    updates:  t.arrayExpression(context.updateAcc)
  };
}

function createSpecObject(t, file, desc){
  const id = file.scope.generateUidIdentifier('xvdomSpec');
  const {bytecode, statics, dynamics, updates} = createSpecBytecodeStaticArrays(t, desc);

  file.path.unshiftContainer('body',
    t.variableDeclaration('var', [
      t.variableDeclarator(id,
        obj(t, {
          b: bytecode,
          s: statics,
          u: updates
        })
      )
    ])
  );

  return {id, dynamics};
}

function createInstanceObject(t, file, desc){
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
            type: (isComponentName(node.name.name) ? 'component' : 'el'),
            key,
            recycle,
            props,
            staticProps,
            hasDynamicProps: !!(props - staticProps),
            el: node.name.name
          };
        }
      },

      JSXElement: {
        exit(path, state){
          const node     = path.node;
          const desc     = node.__xvdom_desc = node.openingElement.__xvdom_desc;
          desc.children  = buildChildren(t, node.children).map((child)=> {
            const isDynamicChild = isDynamic(t, child);
            desc.hasDynamicChildren = desc.hasDynamicChildren || isDynamicChild;
            return child.__xvdom_desc || {
              type   : isDynamicChild ? 'dynamic' : 'static',
              node   : child,
              parent : desc
            };
          });

          if(!t.isJSX(path.parent)){
            path.replaceWith(createInstanceObject(t, state.file, desc));
          }
        }
      }
    }
  };
}
