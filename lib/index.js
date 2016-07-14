'use strict';

exports.__esModule = true;

exports.default = function (_ref3) {
  var t = _ref3.types;

  return {
    visitor: {
      JSXOpeningElement: {
        exit: function exit(_ref4 /*, parent, scope, file */) {
          var node = _ref4.node;
          var attributes = _ref4.node.attributes;

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
            type: 'el',
            key: key,
            recycle: recycle,
            props: props,
            staticProps: staticProps,
            el: node.name.name
          };
        }
      },

      JSXElement: {
        exit: function exit(path, state) {
          var node = path.node;
          var desc = node.__xvdom_desc = node.openingElement.__xvdom_desc;
          desc.children = (0, _helpers.buildChildren)(t, node.children).map(function (child) {
            return child.__xvdom_desc || {
              type: isDynamic(t, child) ? 'dynamic' : 'static',
              node: child
            };
          });

          if (!t.isJSX(path.parent)) {
            path.replaceWith(xcreateInstanceObject(t, state.file, desc));
          }
        }
      }
    }
  };
};

var _helpers = require('./helpers');

var BYTECODE = {
  el: 0,
  component: 1,
  dynamic: 2,
  static: 3,
  child: 4,
  parent: 5
}; //TODO(design): conditionally including globals (createDynamic, createDynamic, createComponent)
//TODO(design): More specific xvdom AST node information (element, component, w/dynamic-props? etc.)
//                - There is waaayyyy to many arguments being passed between the create*Code functions
//                - Need an abstraction to group all relevant information necessary for the code generating functions


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

var STATIC_BYTECODES = [BYTECODE.static];
function staticBytecode(t, s, staticsAcc) {
  staticsAcc.push(s.node);
  return STATIC_BYTECODES;
}

var DYNAMIC_BYTECODES = [BYTECODE.dynamic];
function dynamicBytecode(t, d, dynamicsAcc) {
  dynamicsAcc.push(d.node);
  return DYNAMIC_BYTECODES;
}

function elChildBytecode(t, child, staticsAcc, dynamicsAcc) {
  switch (child.type) {
    case 'el':
      return elBytecode(t, child, staticsAcc, dynamicsAcc);
    case 'static':
      return staticBytecode(t, child, staticsAcc);
    case 'dynamic':
      return dynamicBytecode(t, child, dynamicsAcc);
    default:
      throw 'unknown child type';
  }
}

function elChildrenBytecode(t, children, staticsAcc, dynamicsAcc) {
  return children && children.length ? [BYTECODE.child].concat(children.reduce(function (acc, child) {
    return acc.concat(elChildBytecode(t, child, staticsAcc, dynamicsAcc));
  }, []), [BYTECODE.parent]) : [];
}

function propBytecode(t, props, staticProps, staticsAcc, dynamicsAcc) {
  var numProps = props ? props.length : 0;
  if (numProps === 0) return [numProps];

  props.forEach(function (_ref) {
    var isDynamic = _ref.isDynamic;
    var name = _ref.name;
    var value = _ref.value;

    staticsAcc.push(t.stringLiteral(name));
    (isDynamic ? dynamicsAcc : staticsAcc).push(value);
  }, []);

  return [numProps, staticProps];
}

function elBytecode(t, _ref2, staticsAcc, dynamicsAcc) {
  var el = _ref2.el;
  var props = _ref2.props;
  var staticProps = _ref2.staticProps;
  var children = _ref2.children;

  return [BYTECODE.el, TAG_TO_REF[el]].concat(propBytecode(t, props, staticProps, staticsAcc, dynamicsAcc), elChildrenBytecode(t, children, staticsAcc, dynamicsAcc));
}

function trimPops(t, bytecode) {
  var code = void 0;
  while (bytecode.length && (code = bytecode.pop()) === BYTECODE.parent) {}
  bytecode.push(code);
  return bytecode;
}

function specBytecode(t, desc, staticsAcc, dynamicsAcc) {
  return t.arrayExpression(trimPops(t, elBytecode(t, desc, staticsAcc, dynamicsAcc)).map(function (code) {
    return t.numericLiteral(code);
  }));
}

function createSpecBytecodeStaticArrays(t, desc) {
  var staticsAcc = [];
  var dynamicsAcc = [];
  var bytecode = specBytecode(t, desc, staticsAcc, dynamicsAcc);

  return {
    bytecode: bytecode,
    statics: t.arrayExpression(staticsAcc),
    dynamics: t.arrayExpression(dynamicsAcc)
  };
}

function createSpecObject(t, file, desc) {
  var id = file.scope.generateUidIdentifier('xvdomSpec');

  var _createSpecBytecodeSt = createSpecBytecodeStaticArrays(t, desc);

  var bytecode = _createSpecBytecodeSt.bytecode;
  var statics = _createSpecBytecodeSt.statics;
  var dynamics = _createSpecBytecodeSt.dynamics;


  file.path.unshiftContainer('body', t.variableDeclaration('var', [t.variableDeclarator(id, obj(t, {
    b: bytecode,
    s: statics
  }))]));

  return { id: id, dynamics: dynamics };
}

function xcreateInstanceObject(t, file, desc) {
  var _createSpecObject = createSpecObject(t, file, desc);

  var id = _createSpecObject.id;
  var dynamics = _createSpecObject.dynamics;

  return obj(t, {
    t: id,
    d: dynamics
  });
}