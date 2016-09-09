'use strict';

exports.__esModule = true;

exports.default = function (_ref6) {
  var t = _ref6.types;

  return {
    visitor: {
      JSXOpeningElement: {
        exit: function exit(_ref7) {
          var node = _ref7.node;
          node.__xvdomDesc = getElementDesc(t, node);
        }
      },

      JSXElement: {
        exit: function exit(path, state) {
          var node = path.node;
          var desc = node.__xvdomDesc = node.openingElement.__xvdomDesc;
          desc.children = (0, _helpers.buildChildren)(t, node.children).map(function (child) {
            var isDynamicChild = isDynamic(t, child) && !t.isJSXElement(child);
            return child.__xvdomDesc || {
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

var _ref_to_tag = require('./ref_to_tag');

var _ref_to_tag2 = _interopRequireDefault(_ref_to_tag);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var TAG_TO_REF = _ref_to_tag2.default.reduce(function (acc, tag, i) {
  return acc[tag] = i, acc;
}, {});

var BYTECODE_EL = 0;
var BYTECODE_COMPONENT = 1;
var BYTECODE_DYNAMIC = 2;
var BYTECODE_STATIC = 3;
var BYTECODE_DYNAMIC_ONLY_CHILD = 4;
var BYTECODE_STATIC_ONLY_CHILD = 5;
var BYTECODE_CHILD = 6;
var BYTECODE_PARENT = 7;
var BYTECODE_PUSH_CONTEXTNODE = 8;

var STATIC_BYTECODES = [BYTECODE_STATIC];
var STATIC_ONLY_CHILD_BYTECODES = [BYTECODE_STATIC_ONLY_CHILD];
var DYNAMIC_BYTECODES = [BYTECODE_DYNAMIC];
var DYNAMIC_ONLY_CHILD_BYTECODES = [BYTECODE_DYNAMIC_ONLY_CHILD];

var RERENDER_BYTECODE_ELPROP = 0;
var RERENDER_BYTECODE_CHILD = 1;
var RERENDER_BYTECODE_ONLY_CHILD = 2;

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

function staticBytecode(t, _ref, s, onlyChild) {
  var staticsAcc = _ref.staticsAcc;

  staticsAcc.push(s.node);
  return onlyChild ? STATIC_ONLY_CHILD_BYTECODES : STATIC_BYTECODES;
}

function dynamicBytecode(t, context, d, onlyChild) {
  var dynamicsAcc = context.dynamicsAcc;
  var updateAcc = context.updateAcc;

  dynamicsAcc.push(d.node);
  updateAcc.push(t.numericLiteral(onlyChild ? RERENDER_BYTECODE_ONLY_CHILD : RERENDER_BYTECODE_CHILD), t.numericLiteral(0), t.numericLiteral(context.contextNodeOffset++));
  return onlyChild ? DYNAMIC_ONLY_CHILD_BYTECODES : DYNAMIC_BYTECODES;
}

function elChildBytecode(t, child, onlyChild, context) {
  switch (child.type) {
    case 'el':
      return elBytecode(t, context, child);
    case 'static':
      return staticBytecode(t, context, child, onlyChild);
    case 'dynamic':
      return dynamicBytecode(t, context, child, onlyChild);
    case 'component':
      return componentBytecode(t, context, child);
    default:
      throw 'unknown child type';
  }
}

function elChildrenBytecode(t, context, children) {
  return children && children.length ? [BYTECODE_CHILD].concat(children.reduce(function (acc, child) {
    return acc.concat(elChildBytecode(t, child, children.length === 1, context));
  }, []), [BYTECODE_PARENT]) : [];
}

function elPropsBytecode(t, context, props, staticProps) {
  var staticsAcc = context.staticsAcc;
  var dynamicsAcc = context.dynamicsAcc;
  var updateAcc = context.updateAcc;

  var numProps = props.length;
  if (numProps === 0) return [numProps];

  var hasDynamicProps = !!(numProps - staticProps);
  var contextNodeOffset = hasDynamicProps ? context.contextNodeOffset++ : context.contextNodeOffset;

  props.forEach(function (_ref2) {
    var isDynamic = _ref2.isDynamic;
    var name = _ref2.name;
    var value = _ref2.value;

    var nameOffset = staticsAcc.push(t.stringLiteral(name)) - 1;
    if (isDynamic) {
      dynamicsAcc.push(value);
      updateAcc.push(t.numericLiteral(RERENDER_BYTECODE_ELPROP), t.numericLiteral(nameOffset), t.numericLiteral(contextNodeOffset));
    } else {
      staticsAcc.push(value);
    }
  }, []);

  return [numProps, staticProps].concat(numProps - staticProps ? [BYTECODE_PUSH_CONTEXTNODE] : []);
}

function componentPropsBytecode(t, props, staticProps, _ref3) {
  var staticsAcc = _ref3.staticsAcc;
  var dynamicsAcc = _ref3.dynamicsAcc;

  var numProps = props.length;
  if (numProps === 0) return [numProps];

  props.forEach(function (_ref4) {
    var isDynamic = _ref4.isDynamic;
    var name = _ref4.name;
    var value = _ref4.value;

    staticsAcc.push(t.stringLiteral(name));
    (isDynamic ? dynamicsAcc : staticsAcc).push(value);
  }, []);

  return [numProps, staticProps];
}

function elBytecode(t, context, desc) {
  var el = desc.el;
  var props = desc.props;
  var staticProps = desc.staticProps;
  var children = desc.children;


  return [BYTECODE_EL, TAG_TO_REF[el]].concat(elPropsBytecode(t, context, props, staticProps), elChildrenBytecode(t, context, children));
}

function componentBytecode(t, context, _ref5) {
  var el = _ref5.el;
  var props = _ref5.props;
  var staticProps = _ref5.staticProps;

  context.staticsAcc.push(t.identifier(el));
  return [BYTECODE_COMPONENT].concat(componentPropsBytecode(t, props, staticProps, context));
}

function trimTrailingParentBytecode(t, bytecode) {
  var code = void 0;
  while (bytecode.length && (code = bytecode.pop()) === BYTECODE_PARENT) {}
  bytecode.push(code);
  return bytecode;
}

function specBytecode(t, root, context) {
  return t.arrayExpression(trimTrailingParentBytecode(t, (root.type === 'el' ? elBytecode : componentBytecode)(t, context, root)).map(function (code) {
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

  var instanceObj = {
    t: id,
    d: dynamics
  };
  if (desc.key) instanceObj.k = desc.key;
  return obj(t, instanceObj);
}

function getElementDesc(t, node) {
  var key = void 0;
  var recycle = false;
  var staticProps = 0;
  var props = node.attributes.reduce(function (props, attr) {
    var propName = attr.name.name;
    var value = transformProp(t, attr.value);
    var _isDynamic = false;

    if (propName === 'key') key = value;else if (propName === 'recycle') recycle = true;else if (value != null) {
      if (!(_isDynamic = isDynamic(t, value))) staticProps++;
      props.push({
        isDynamic: _isDynamic,
        name: propName,
        value: value
      });
    }

    return props;
  }, []);

  return {
    type: isComponentName(node.name.name) ? 'component' : 'el',
    key: key,
    recycle: recycle,
    props: props,
    staticProps: staticProps,
    el: node.name.name
  };
}