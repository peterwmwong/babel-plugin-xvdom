'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//TODO(design): conditionally including globals (createDynamic, createDynamic, createComponent)
//TODO(design): More specific xvdom AST node information (element, component, w/dynamic-props? etc.)
//                - There is waaayyyy to many arguments being passed between the create*Code functions
//                - Need an abstraction to group all relevant information necessary for the code generating functions
var _require = require('./helpers.js');

var buildChildren = _require.buildChildren;
var toReference = _require.toReference;


var genId = require('./genId.js');

var EMPTY_ARRAY = [];

var isComponentName = function isComponentName(name) {
  return name && /^[A-Z]/.test(name);
};

var hasSideEffects = function hasSideEffects(tag, propName) {
  return tag === 'input' && propName === 'value' || tag === 'a' && propName === 'href';
};

var _globalsForFile = new Map();
var globals = {
  get: function get(file, name) {
    var prefixedName = 'xvdom' + name[0].toUpperCase() + name.slice(1);
    var fileGlobals = _globalsForFile.get(file) || _globalsForFile.set(file, {}).get(file);
    return fileGlobals[name] || (fileGlobals[name] = file.scope.generateUidIdentifier(prefixedName));
  },
  forFile: function forFile(file) {
    return _globalsForFile.get(file);
  }
};

function isDynamicNode(t, astNode) {
  if (t.isLiteral(astNode)) {
    return false;
  }

  if (t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)) {
    return isDynamicNode(t, astNode.left) || isDynamicNode(t, astNode.right);
  }

  if (t.isUnaryExpression(astNode)) {
    return isDynamicNode(t, astNode.argument);
  }

  return true;
}

function obj(t, keyValues) {
  return t.objectExpression(Object.keys(keyValues).map(function (key) {
    return t.objectProperty(t.identifier(key), keyValues[key]);
  }));
}

function transformProp(t, prop) {
  return t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression) : t.isJSXEmptyExpression(prop) ? null : t.isIdentifier(prop) || t.isMemberExpression(prop) ? toReference(t, prop) : prop == null ? t.booleanLiteral(true) : prop;
}

var instParamId = function instParamId(t) {
  return t.identifier('inst');
};
var prevInstParamId = function prevInstParamId(t) {
  return t.identifier('pInst');
};
var tmpVarId = function tmpVarId(t, num) {
  return t.identifier('_n' + (num ? ++num : ''));
};

function generateAssignPropsCode(_ref, nodeVarId, _ref2) {
  var t = _ref.t;
  var instId = _ref.instId;
  var statements = _ref.statements;
  var props = _ref2.props;
  var instanceContextId = _ref2.instanceContextId;

  if (instanceContextId) {
    statements.push(t.expressionStatement(t.assignmentExpression('=', t.memberExpression(instId, instanceContextId), nodeVarId)));
  }

  statements.push.apply(statements, props.map(function (_ref3) {
    var isDynamic = _ref3.isDynamic;
    var dynamic = _ref3.dynamic;
    var nameId = _ref3.nameId;
    var valueNode = _ref3.valueNode;

    var valueCode = isDynamic ? t.memberExpression(instId, dynamic.instanceValueId) : valueNode;

    if (dynamic.hasSideEffects) {
      return t.ifStatement(t.binaryExpression('!=', valueCode, t.nullLiteral()), t.expressionStatement(t.assignmentExpression('=', t.memberExpression(nodeVarId, nameId), valueCode)));
    } else {
      return t.expressionStatement(t.assignmentExpression('=', t.memberExpression(nodeVarId, nameId), valueCode));
    }
  }));
}

function generateSpecElementDynamicChildCode(_ref4, childDesc, parentNodeVarId) {
  var t = _ref4.t;
  var xvdomApi = _ref4.xvdomApi;
  var statements = _ref4.statements;
  var instId = _ref4.instId;
  var _childDesc$dynamic = childDesc.dynamic;
  var instanceContextId = _childDesc$dynamic.instanceContextId;
  var instanceValueId = _childDesc$dynamic.instanceValueId;
  var isOnlyChild = _childDesc$dynamic.isOnlyChild;

  statements.push(t.expressionStatement(t.callExpression(t.memberExpression(parentNodeVarId, t.identifier('appendChild')), [t.assignmentExpression('=', t.memberExpression(instId, instanceContextId), t.callExpression(xvdomApi.accessFunction('createDynamic'), [t.booleanLiteral(isOnlyChild), parentNodeVarId, t.memberExpression(instId, instanceValueId)]))])));
}

function generateSpecElementStaticChildCode(_ref5, _ref6, parentNodeVarId) {
  var t = _ref5.t;
  var xvdomApi = _ref5.xvdomApi;
  var statements = _ref5.statements;
  var instId = _ref5.instId;
  var node = _ref6.node;

  // _n.appendChild(document.createTextNode(("hello" + 5) || ""));
  statements.push(t.expressionStatement(t.callExpression(t.memberExpression(parentNodeVarId, t.identifier('appendChild')), [t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('createTextNode')), [t.logicalExpression('||', t.sequenceExpression([node]), t.stringLiteral(''))])])));
}

function generateSpecCreateComponentCode(context, el, _) {
  var depth = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var t = context.t;
  var instId = context.instId;
  var xvdomApi = context.xvdomApi;
  var tmpVars = context.tmpVars;
  var statements = context.statements;

  var componentId = t.identifier(el.tag);

  var propsArg = !el.props.length ? t.nullLiteral() : obj(t, el.props.reduce(function (acc, _ref7) {
    var nameId = _ref7.nameId;
    var valueNode = _ref7.valueNode;

    acc[nameId.name] = valueNode;
    return acc;
  }, {}));

  // Create element
  // ex. _xvdomCreateComponent('div');
  var createCode = t.memberExpression(t.callExpression(xvdomApi.accessFunction('createComponent'), [componentId, t.memberExpression(componentId, t.identifier('state')), propsArg, instId]), t.identifier('$n'));

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  if (tmpVars[depth]) {
    // ...Otherwise assign it to the temp variable.
    statements.push(t.expressionStatement(t.assignmentExpression('=', tmpVars[depth], createCode)));
  } else {
    tmpVars[depth] = t.variableDeclarator(tmpVarId(t, depth), createCode);
  }

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if (depth) {
    statements.push(t.expressionStatement(t.callExpression(t.memberExpression(tmpVars[depth - 1].id, t.identifier('appendChild')), [tmpVars[depth].id])));
  }
}

function generateSpecCreateHTMLElementCode(context, el, _) {
  var depth = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  var t = context.t;
  var xvdomApi = context.xvdomApi;
  var tmpVars = context.tmpVars;
  var statements = context.statements;

  // Create element
  // ex. _xvdomEl('div');

  var createCode = t.callExpression(xvdomApi.accessFunction('el'), [t.stringLiteral(el.tag)]);

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  var tmpVar = tmpVars[depth] ? tmpVars[depth].id : tmpVarId(t, depth);
  if (!tmpVars[depth]) {
    tmpVars[depth] = t.variableDeclarator(tmpVar, createCode);
  } else {
    // ...Otherwise assign it to the temp variable.
    statements.push(t.expressionStatement(t.assignmentExpression('=', tmpVar, createCode)));
  }

  // Assign props
  generateAssignPropsCode(context, tmpVars[depth].id, el);

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if (depth) {
    statements.push(t.expressionStatement(t.callExpression(t.memberExpression(tmpVars[depth - 1].id, t.identifier('appendChild')), [tmpVars[depth].id])));
  }

  ++depth;

  el.children.forEach(function (childDesc) {
    return CHILD_CODE_GENERATORS[childDesc.type](context, childDesc, tmpVar, depth);
  });
}

var CHILD_CODE_GENERATORS = {
  component: generateSpecCreateComponentCode,
  el: generateSpecCreateHTMLElementCode,
  dynamicChild: generateSpecElementDynamicChildCode,
  staticChild: generateSpecElementStaticChildCode
};

function generateSpecCreateElementCode(context, el) {
  var depth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  return el.type === 'el' ? generateSpecCreateHTMLElementCode(context, el, null, depth) : generateSpecCreateComponentCode(context, el, null, depth);
}

function generateSpecCreateCode(t, xvdomApi, _ref8) {
  var rootElement = _ref8.rootElement;
  var dynamics = _ref8.dynamics;
  var hasComponents = _ref8.hasComponents;

  var context = {
    t: t,
    xvdomApi: xvdomApi,
    instId: instParamId(t),
    tmpVars: [],
    statements: []
  };

  generateSpecCreateElementCode(context, rootElement);

  var params = hasComponents || dynamics.length ? [instParamId(t)] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([t.variableDeclaration('var', context.tmpVars)].concat(context.statements, [t.returnStatement(context.tmpVars[0].id)])));
}

//TODO: function generateSpecUpdateDynamicPropCode(){}
//TODO: function generateSpecUpdateDynamicChildCode(){}

function generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, tmpVar, dynamic) {
  var type = dynamic.type;
  var instanceContextId = dynamic.instanceContextId;
  var instanceValueId = dynamic.instanceValueId;
  var name = dynamic.name;
  var isOnlyChild = dynamic.isOnlyChild;
  var hasSideEffects = dynamic.hasSideEffects;

  if (type === 'prop') {
    return [t.expressionStatement(t.assignmentExpression('=', tmpVar, t.memberExpression(instId, instanceValueId))), t.ifStatement(t.binaryExpression('!==', tmpVar, t.memberExpression(pInstId, instanceValueId)), hasSideEffects ? t.blockStatement([t.ifStatement(t.binaryExpression('!==', t.memberExpression(t.memberExpression(pInstId, instanceContextId), name), tmpVar), t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.memberExpression(pInstId, instanceContextId), name), tmpVar))), t.expressionStatement(t.assignmentExpression('=', t.memberExpression(pInstId, instanceValueId), tmpVar))]) : t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.memberExpression(pInstId, instanceContextId), name), t.assignmentExpression('=', t.memberExpression(pInstId, instanceValueId), tmpVar))))];
  } else {
    return [t.ifStatement(t.binaryExpression('!==', t.memberExpression(instId, instanceValueId), t.memberExpression(pInstId, instanceValueId)), t.expressionStatement(t.assignmentExpression('=', t.memberExpression(pInstId, instanceContextId), t.callExpression(xvdomApi.accessFunction('updateDynamic'), [t.booleanLiteral(isOnlyChild), t.memberExpression(pInstId, instanceValueId), t.assignmentExpression('=', t.memberExpression(pInstId, instanceValueId), t.memberExpression(instId, instanceValueId)), t.memberExpression(pInstId, instanceContextId)]))))];
  }
}

function generateSpecUpdateCode(t, xvdomApi, _ref9) {
  var dynamics = _ref9.dynamics;

  var instId = instParamId(t);
  var pInstId = prevInstParamId(t);
  var tmpVar = t.identifier('v');
  var params = dynamics.length ? [instId, pInstId] : EMPTY_ARRAY;
  var statements = !dynamics.length ? [] : [t.variableDeclaration('var', [t.variableDeclarator(tmpVar)])].concat(dynamics.reduce(function (acc, dynamic) {
    acc.push.apply(acc, generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, tmpVar, dynamic));
    return acc;
  }, []));

  return t.functionExpression(null, params, t.blockStatement(statements));
}

function generateInstanceCode(t, xvdomApi, _ref10) {
  var dynamics = _ref10.dynamics;
  var id = _ref10.id;

  return obj(t, dynamics.reduce(function (acc, dynamic) {
    acc[dynamic.instanceValueId.name] = dynamic.value;
    return acc;
  }, { $s: id }));
}

function generateRenderingCode(t, xvdomApi, template) {
  return {
    specCode: obj(t, {
      c: generateSpecCreateCode(t, xvdomApi, template),
      u: generateSpecUpdateCode(t, xvdomApi, template),
      r: t.memberExpression(t.identifier('xvdom'), t.identifier('DEADPOOL'))
    }),
    instanceCode: generateInstanceCode(t, xvdomApi, template)
  };
}

function declareGlobal(t, file, id, value) {
  file.path.unshiftContainer('body', t.variableDeclaration('var', [t.variableDeclarator(id, value)]));
}

/*
type ElementProp {
  isDynamic: boolean,
  nameId: Identifier,
  valueNode: Node
}
*/
function parseElementProps(_ref11, node, nodeAttributes) /*:ElementProp[]*/{
  var t = _ref11.t;
  var file = _ref11.file;
  var context = _ref11.context;

  return nodeAttributes.map(function (attr) {
    // TODO: rename transformProp to normalizeElementPropValue
    var valueNode = transformProp(t, attr.value);
    // TODO: try just using attr.name without wrapping t.identifier()
    var name = attr.name.name;
    var nameId = t.identifier(attr.name.name);
    var isDynamic = isDynamicNode(t, valueNode);

    return {
      dynamic: isDynamic && context.addDynamicProp(node, nameId, valueNode, hasSideEffects(node.tag, name)),
      isDynamic: isDynamic,
      nameId: nameId,
      valueNode: valueNode
    };
  });
}

/*
type ElementChild {
  isDynamic: boolean,
  node: Node
}
*/
function parseElementChild(_ref12, el, childNode, isOnlyChild) /*:ElementChild*/{
  var t = _ref12.t;
  var file = _ref12.file;
  var context = _ref12.context;

  var isDynamic = isDynamicNode(t, childNode);
  return {
    type: isDynamic ? 'dynamicChild' : 'staticChild',
    dynamic: isDynamic && context.addDynamicChild(el, childNode, isOnlyChild),
    node: childNode
  };
}

/*
type Element {
  props: ElementProp[],
  children: (Element|ElementChild)[]
}
*/
function parseElement(_ref13, _ref14) /*:Element*/{
  var t = _ref13.t;
  var file = _ref13.file;
  var context = _ref13.context;
  var _ref14$openingElement = _ref14.openingElement;
  var name = _ref14$openingElement.name;
  var attributes = _ref14$openingElement.attributes;
  var children = _ref14.children;

  var isComponent = isComponentName(name.name);
  var filteredChildren = buildChildren(t, children);
  var hasOnlyOneChild = filteredChildren.length === 1;
  var el = {
    type: isComponent ? 'component' : 'el',
    tag: name.name
  };
  el.props = parseElementProps(context, el, attributes);
  el.children = isComponent ? EMPTY_ARRAY : filteredChildren.map(function (child) {
    return t.isJSXElement(child) ? parseElement(context, child) : parseElementChild(context, el, child, hasOnlyOneChild);
  });

  if (isComponent) context.hasComponents = true;
  return el;
}

var ParsingContext = function () {
  function ParsingContext(t, file) {
    _classCallCheck(this, ParsingContext);

    this.t = t;
    this.file = file;
    this.dynamics = [];
    this._instanceParamIndex = 0;
    this.context = this;
    this.hasComponents = false;
  }

  ParsingContext.prototype.addDynamicChild = function addDynamicChild(parentEl, childNode, isOnlyChild) /*:{type:String, value:Node, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    return this._addDynamic({
      type: 'child',
      value: childNode,
      instanceContextId: this._generateInstanceParamId(),
      instanceValueId: this._generateInstanceParamId(),
      isOnlyChild: isOnlyChild
    });
  };

  ParsingContext.prototype.addDynamicProp = function addDynamicProp(el, name, value, hasSideEffects) /*:{type:String, name:String, value:Node, hasSideEffects:Boolean, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    return this._addDynamic({
      type: 'prop',
      name: name,
      value: value,
      hasSideEffects: hasSideEffects,
      instanceContextId: this._getInstanceContextIdForNode(el),
      instanceValueId: this._generateInstanceParamId()
    });
  };

  ParsingContext.prototype._addDynamic = function _addDynamic(dynamic) {
    this.dynamics.push(dynamic);
    return dynamic;
  };

  ParsingContext.prototype._getInstanceContextIdForNode = function _getInstanceContextIdForNode(el) {
    if (!el.instanceContextId) el.instanceContextId = this._generateInstanceParamId();
    return el.instanceContextId;
  };

  ParsingContext.prototype._generateInstanceParamId = function _generateInstanceParamId() {
    return this.t.identifier(genId(this._instanceParamIndex++));
  };

  return ParsingContext;
}();

function parseTemplate(t, file, node) /*:{id:Identifier, root:Element}*/{
  var context = new ParsingContext(t, file);
  return {
    id: file.scope.generateUidIdentifier('xvdomSpec'),
    rootElement: parseElement(context, node),
    dynamics: context.dynamics,
    hasComponents: context.hasComponents
  };
}

module.exports = function Plugin(_ref15) {
  var t = _ref15.types;

  return {
    visitor: {
      Program: {
        exit: function exit(path, _ref16) {
          var file = _ref16.file;

          var fileGlobals = globals.forFile(file);
          if (fileGlobals && Object.keys(fileGlobals).length) {
            file.path.unshiftContainer('body', t.variableDeclaration('var', Object.keys(fileGlobals).sort().map(function (key) {
              return t.variableDeclarator(fileGlobals[key], t.memberExpression(t.identifier('xvdom'), t.identifier(key)));
            })));
          }
        }
      },

      JSXElement: {
        exit: function exit(path, _ref17) {
          var file = _ref17.file;
          var node = path.node;
          var parent = path.parent;

          if (!t.isJSX(parent)) {
            var template = parseTemplate(t, file, node);
            var xvdomApi = {
              accessFunction: function accessFunction(funcName) {
                return globals.get(file, funcName);
              }
            };

            var _generateRenderingCod = generateRenderingCode(t, xvdomApi, template);

            var specCode = _generateRenderingCod.specCode;
            var instanceCode = _generateRenderingCod.instanceCode;


            path.replaceWith(instanceCode);
            declareGlobal(t, file, template.id, specCode);
          }
        }
      }
    }
  };
};