'use strict';

exports.__esModule = true;

exports.default = function (_ref8) {
  var t = _ref8.types;

  return {
    visitor: {
      JSXOpeningElement: {
        exit: function exit(_ref9 /*, parent, scope, file */) {
          var node = _ref9.node;
          var attributes = _ref9.node.attributes;

          var key = void 0;
          var recycle = false;
          var staticProps = 0;
          var props = attributes.length && attributes.reduce(function (props, attr) {
            var propName = attr.name.name;
            var value = transformProp(t, attr.value);
            var _isDynamic = false;

            if (propName === 'key') {
              key = value;
            } else if (propName === 'recycle') {
              recycle = true;
            } else if (value != null) {
              if (!(_isDynamic = isDynamic(t, value))) staticProps++;
              props.push({
                isDynamic: _isDynamic,
                name: propName,
                value: value
              });
            }

            return props;
          }, []);

          node.__xvdom_desc = {
            type: isComponentName(node.name.name) ? 'component' : 'el',
            key: key,
            recycle: recycle,
            props: props,
            staticProps: staticProps,
            hasDynamicProps: !!(props - staticProps),
            el: node.name.name
          };
        }
      },

      JSXElement: {
        exit: function exit(path, state) {
          var node = path.node;
          var desc = node.__xvdom_desc = node.openingElement.__xvdom_desc;
          desc.children = (0, _helpers.buildChildren)(t, node.children).map(function (child) {
            var isDynamicChild = isDynamic(t, child) && !t.isJSXElement(child);
            desc.hasDynamicChildren = desc.hasDynamicChildren || isDynamicChild;
            return child.__xvdom_desc || {
              type: isDynamicChild ? 'dynamic' : 'static',
              node: child,
              parent: desc
            };
          });

          if (!t.isJSX(path.parent)) {
            path.replaceWith(createInstanceObject(t, state.file, desc));
          }
        }
      }
    }
  };
};

var _helpers = require('./helpers');

var BYTECODE_EL = 0;
var BYTECODE_COMPONENT = 1;
var BYTECODE_DYNAMIC = 2;
var BYTECODE_STATIC = 3;
var BYTECODE_CHILD = 4;
var BYTECODE_PARENT = 5;
var BYTECODE_PUSH_CONTEXTNODE = 6;

var RERENDER_BYTECODE_ELPROP = 0;
var RERENDER_BYTECODE_CHILD = 1;

var REF_TO_TAG = ['a', 'b', 'div', 'i', 'input', 'span'];

var TAG_TO_REF = REF_TO_TAG.reduce(function (acc, tag, i) {
  return acc[tag] = i, acc;
}, {});

function isComponentName(name) {
  return name && /^[A-Z]/.test(name);
}

function isDynamic(t, astNode) {
  if (t.isLiteral(astNode)) {
    return false;
  } else if (t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)) {
    return isDynamic(t, astNode.left) || isDynamic(t, astNode.right);
  } else if (t.isUnaryExpression(astNode)) {
    return isDynamic(t, astNode.argument);
  }
  return true;
}

function objProp(t, key, value) {
  return t.objectProperty(t.isIdentifier(key) ? key : t.identifier(key), value);
}

function objProps(t, keyValues) {
  return Object.keys(keyValues).map(function (key) {
    return objProp(t, key, keyValues[key]);
  });
}

function obj(t, keyValues) {
  return t.objectExpression(objProps(t, keyValues));
}

function transformProp(t, prop) {
  return t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression) : t.isJSXEmptyExpression(prop) ? null : t.isIdentifier(prop) || t.isMemberExpression(prop) ? (0, _helpers.toReference)(t, prop) : prop == null ? t.booleanLiteral(true) : prop;
}

var STATIC_BYTECODES = [BYTECODE_STATIC];
function staticBytecode(t, s, _ref) {
  var staticsAcc = _ref.staticsAcc;

  staticsAcc.push(s.node);
  return STATIC_BYTECODES;
}

var DYNAMIC_BYTECODES = [BYTECODE_DYNAMIC];
function dynamicBytecode(t, d, _ref2) {
  var dynamicsAcc = _ref2.dynamicsAcc;
  var updateAcc = _ref2.updateAcc;

  dynamicsAcc.push(d.node);
  updateAcc.push(t.numericLiteral(RERENDER_BYTECODE_CHILD), t.numericLiteral(d.parent.contextNodeOffset));
  return DYNAMIC_BYTECODES;
}

function elChildBytecode(t, child, context) {
  switch (child.type) {
    case 'el':
      return elBytecode(t, child, context);
    case 'static':
      return staticBytecode(t, child, context);
    case 'dynamic':
      return dynamicBytecode(t, child, context);
    case 'component':
      return componentBytecode(t, child, context);
    default:
      throw 'unknown child type';
  }
}

function elChildrenBytecode(t, children, context) {
  return children && children.length ? [BYTECODE_CHILD].concat(children.reduce(function (acc, child) {
    return acc.concat(elChildBytecode(t, child, context));
  }, []), [BYTECODE_PARENT]) : [];
}

function propBytecode(t, props, staticProps, _ref3) {
  var staticsAcc = _ref3.staticsAcc;
  var dynamicsAcc = _ref3.dynamicsAcc;
  var updateAcc = _ref3.updateAcc;

  var numProps = props ? props.length : 0;
  if (numProps === 0) return [numProps];

  props.forEach(function (_ref4) {
    var isDynamic = _ref4.isDynamic;
    var name = _ref4.name;
    var value = _ref4.value;

    var nameOffset = staticsAcc.push(t.stringLiteral(name)) - 1;
    if (isDynamic) {
      dynamicsAcc.push(value);
      updateAcc.push(t.numericLiteral(RERENDER_BYTECODE_ELPROP), t.numericLiteral(nameOffset << 16));
    } else {
      staticsAcc.push(value);
    }
  }, []);

  return [numProps, staticProps];
}

function componentPropBytecode(t, props, staticProps, _ref5) {
  var staticsAcc = _ref5.staticsAcc;
  var dynamicsAcc = _ref5.dynamicsAcc;

  var numProps = props ? props.length : 0;
  if (numProps === 0) return [numProps];

  props.forEach(function (_ref6) {
    var isDynamic = _ref6.isDynamic;
    var name = _ref6.name;
    var value = _ref6.value;

    staticsAcc.push(t.stringLiteral(name));
    (isDynamic ? dynamicsAcc : staticsAcc).push(value);
  }, []);

  return [numProps, staticProps];
}

function elBytecode(t, desc, context) {
  var el = desc.el;
  var props = desc.props;
  var staticProps = desc.staticProps;
  var children = desc.children;
  var hasDynamicProps = desc.hasDynamicProps;
  var hasDynamicChildren = desc.hasDynamicChildren;

  var willPushContextNode = hasDynamicProps || hasDynamicChildren;

  if (willPushContextNode) desc.contextNodeOffset = context.contextNodeOffset++;

  return [BYTECODE_EL, TAG_TO_REF[el]].concat(propBytecode(t, props, staticProps, context), willPushContextNode ? [BYTECODE_PUSH_CONTEXTNODE] : [], elChildrenBytecode(t, children, context));
}

function componentBytecode(t, _ref7, context) {
  var el = _ref7.el;
  var props = _ref7.props;
  var staticProps = _ref7.staticProps;

  context.staticsAcc.push(t.identifier(el));
  return [BYTECODE_COMPONENT].concat(componentPropBytecode(t, props, staticProps, context));
}

function trimPops(t, bytecode) {
  var code = void 0;
  while (bytecode.length && (code = bytecode.pop()) === BYTECODE_PARENT) {}
  bytecode.push(code);
  return bytecode;
}

function specBytecode(t, root, context) {
  return t.arrayExpression(trimPops(t, (root.type === 'el' ? elBytecode : componentBytecode)(t, root, context)).map(function (code) {
    return t.numericLiteral(code);
  }));
}

function createSpecBytecodeStaticArrays(t, desc) {
  var context = {
    staticsAcc: [],
    dynamicsAcc: [],
    updateAcc: [],
    contextNodeOffset: 0
  };
  var bytecode = specBytecode(t, desc, context);

  return {
    bytecode: bytecode,
    statics: t.arrayExpression(context.staticsAcc),
    dynamics: t.arrayExpression(context.dynamicsAcc),
    updates: t.arrayExpression(context.updateAcc)
  };
}

function createSpecObject(t, file, desc) {
  var id = file.scope.generateUidIdentifier('xvdomSpec');

  var _createSpecBytecodeSt = createSpecBytecodeStaticArrays(t, desc);

  var bytecode = _createSpecBytecodeSt.bytecode;
  var statics = _createSpecBytecodeSt.statics;
  var dynamics = _createSpecBytecodeSt.dynamics;
  var updates = _createSpecBytecodeSt.updates;


  file.path.unshiftContainer('body', t.variableDeclaration('var', [t.variableDeclarator(id, obj(t, {
    b: bytecode,
    s: statics,
    u: updates
  }))]));

  return { id: id, dynamics: dynamics };
}

function createInstanceObject(t, file, desc) {
  var _createSpecObject = createSpecObject(t, file, desc);

  var id = _createSpecObject.id;
  var dynamics = _createSpecObject.dynamics;

  return obj(t, {
    t: id,
    d: dynamics
  });
}