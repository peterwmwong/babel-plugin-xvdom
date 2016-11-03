'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./helpers.js');

var buildChildren = _require.buildChildren;
var toReference = _require.toReference;


var genId = require('./genId.js');

var EMPTY_ARRAY = [];

var isKeyAttribute = function isKeyAttribute(attr) {
  return attr.name.name === 'key';
};
var isComponentName = function isComponentName(name) {
  return name && /^[A-Z]/.test(name);
};
var nonComponentPropDynamic = function nonComponentPropDynamic(dyn) {
  return dyn.type !== 'componentProp';
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

function normalizeElementPropValue(t, prop) {
  return t.isJSXExpressionContainer(prop) ? normalizeElementPropValue(t, prop.expression) : t.isJSXEmptyExpression(prop) ? null : t.isIdentifier(prop) || t.isMemberExpression(prop) ? toReference(t, prop) : prop == null ? t.booleanLiteral(true) : prop;
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

function generateSpecCreateComponentCode(context, el, depth) {
  var t = context.t;
  var instId = context.instId;
  var xvdomApi = context.xvdomApi;
  var tmpVars = context.tmpVars;
  var statements = context.statements;

  var componentId = t.identifier(el.tag);
  var propsArg = !el.props.length ? t.nullLiteral() : obj(t, el.props.reduce(function (acc, _ref7) {
    var nameId = _ref7.nameId;
    var valueNode = _ref7.valueNode;
    var dynamic = _ref7.dynamic;
    return acc[nameId.name] = dynamic ? t.memberExpression(instId, dynamic.instanceValueId) : valueNode, acc;
  }, {}));

  // Create element
  // ex. _xvdomCreateComponent('div');
  var createComponentCode = t.callExpression(xvdomApi.accessFunction('createComponent'), [componentId, t.memberExpression(componentId, t.identifier('state')), propsArg, instId]);
  if (el.hasDynamicProps) {
    createComponentCode = t.assignmentExpression('=', t.memberExpression(instId, el.instanceContextId), createComponentCode);
  }

  var createCode = t.memberExpression(createComponentCode, t.identifier('$n'));

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

function generateSpecCreateHTMLElementCode(context, el, depth) {
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
    switch (childDesc.type) {
      case 'component':
        return generateSpecCreateComponentCode(context, childDesc, depth);
      case 'el':
        return generateSpecCreateHTMLElementCode(context, childDesc, depth);
      case 'dynamicChild':
        return generateSpecElementDynamicChildCode(context, childDesc, tmpVar);
      case 'staticChild':
        return generateSpecElementStaticChildCode(context, childDesc, tmpVar);
    }
  });
}

function generateSpecCreateElementCode(context, el) {
  return el.type === 'el' ? generateSpecCreateHTMLElementCode(context, el, 0) : generateSpecCreateComponentCode(context, el, 0);
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

function generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, tmpVar, component) {
  var dynamicProps = component.props.filter(function (p) {
    return p.dynamic;
  });
  var condition = dynamicProps.map(function (p) {
    return t.binaryExpression('!==', t.memberExpression(instId, p.dynamic.instanceValueId), t.memberExpression(pInstId, p.dynamic.instanceValueId));
  }).reduce(function (expra, exprb) {
    return t.logicalExpression('||', expra, exprb);
  });
  return t.ifStatement(condition, t.expressionStatement(t.assignmentExpression('=', t.memberExpression(pInstId, component.instanceContextId), t.callExpression(xvdomApi.accessFunction('updateComponent'), [t.identifier(component.tag), t.memberExpression(t.identifier(component.tag), t.identifier('state')), obj(t, component.props.reduce(function (hash, p) {
    hash[p.nameId.name] = !p.dynamic ? p.valueNode : t.assignmentExpression('=', t.memberExpression(pInstId, p.dynamic.instanceValueId), t.memberExpression(instId, p.dynamic.instanceValueId));
    return hash;
  }, {})), t.memberExpression(pInstId, component.instanceContextId)]))));
}

function generateSpecUpdateCode(t, xvdomApi, _ref9) {
  var dynamics = _ref9.dynamics;
  var componentsWithDyanmicProps = _ref9.componentsWithDyanmicProps;

  if (!dynamics.length) return t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY));

  var instId = instParamId(t);
  var pInstId = prevInstParamId(t);
  var tmpVar = t.identifier('v');
  return t.functionExpression(null, [instId, pInstId], t.blockStatement([t.variableDeclaration('var', [t.variableDeclarator(tmpVar)])].concat(dynamics.filter(nonComponentPropDynamic).reduce(function (acc, dynamic) {
    acc.push.apply(acc, generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, tmpVar, dynamic));
    return acc;
  }, []), componentsWithDyanmicProps.map(function (component) {
    return generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, tmpVar, component);
  }))));
}

function generateInstanceCode(t, xvdomApi, _ref10) {
  var dynamics = _ref10.dynamics;
  var id = _ref10.id;
  var key = _ref10.key;

  return obj(t, dynamics.reduce(function (acc, _ref11) {
    var instanceValueId = _ref11.instanceValueId;
    var value = _ref11.value;

    acc[instanceValueId.name] = value;
    return acc;
  }, Object.assign({ $s: id }, key && { key: key })));
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
function parseElementProps(_ref12, node, nodeAttributes) /*:ElementProp[]*/{
  var t = _ref12.t;
  var file = _ref12.file;
  var context = _ref12.context;

  return nodeAttributes.reduce(function (props, attr) {
    if (!isKeyAttribute(attr)) {
      var valueNode = normalizeElementPropValue(t, attr.value);
      var name = attr.name.name;
      var nameId = t.identifier(name);
      var isDynamic = isDynamicNode(t, valueNode);

      props.push({
        dynamic: isDynamic && context.addDynamicProp(node, nameId, valueNode, hasSideEffects(node.tag, name)),
        isDynamic: isDynamic,
        nameId: nameId,
        valueNode: valueNode
      });
    }
    return props;
  }, []);
}

/*
type ElementChild {
  isDynamic: boolean,
  node: Node
}
*/
function parseElementChild(_ref13, el, childNode, isOnlyChild) /*:ElementChild*/{
  var t = _ref13.t;
  var file = _ref13.file;
  var context = _ref13.context;

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
function parseElement(_ref14, _ref15) /*:Element*/{
  var t = _ref14.t;
  var file = _ref14.file;
  var context = _ref14.context;
  var _ref15$openingElement = _ref15.openingElement;
  var name = _ref15$openingElement.name;
  var attributes = _ref15$openingElement.attributes;
  var children = _ref15.children;

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
  el.hasDynamicProps = el.props.some(function (p) {
    return p.dynamic;
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
    this.componentsWithDyanmicProps = new Set();
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
    var isElementProp = el.type === 'el';
    var dynamic = {
      type: isElementProp ? 'prop' : 'componentProp',
      name: name,
      value: value,
      hasSideEffects: hasSideEffects,
      instanceContextId: this._getInstanceContextIdForNode(el),
      instanceValueId: this._generateInstanceParamId()
    };
    return isElementProp ? this._addDynamic(dynamic) : this._addDynamicPropForComponent(el, dynamic);
  };

  ParsingContext.prototype._addDynamic = function _addDynamic(dynamic) {
    this.dynamics.push(dynamic);
    return dynamic;
  };

  ParsingContext.prototype._addDynamicPropForComponent = function _addDynamicPropForComponent(component, dynamic) {
    this.componentsWithDyanmicProps.add(component);
    return this._addDynamic(dynamic);
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

function parseElementKeyProp(t, _ref16) {
  var attributes = _ref16.attributes;

  var keyAttr = attributes.find(isKeyAttribute);
  if (keyAttr) return normalizeElementPropValue(t, keyAttr.value);
}

function parseTemplate(t, file, node) /*:{id:Identifier, root:Element}*/{
  var context = new ParsingContext(t, file);
  return {
    id: file.scope.generateUidIdentifier('xvdomSpec'),
    key: parseElementKeyProp(t, node.openingElement),
    rootElement: parseElement(context, node),
    dynamics: context.dynamics,
    componentsWithDyanmicProps: Array.from(context.componentsWithDyanmicProps.keys()),
    hasComponents: context.hasComponents
  };
}

module.exports = function Plugin(_ref17) {
  var t = _ref17.types;

  return {
    visitor: {
      JSXElement: {
        exit: function exit(path, _ref18) {
          var file = _ref18.file;
          var node = path.node;
          var parent = path.parent;

          if (t.isJSX(parent)) return;

          var template = parseTemplate(t, file, node);
          var xvdomApi = { accessFunction: function accessFunction(apiFunc) {
              return globals.get(file, apiFunc);
            } };

          var _generateRenderingCod = generateRenderingCode(t, xvdomApi, template);

          var specCode = _generateRenderingCod.specCode;
          var instanceCode = _generateRenderingCod.instanceCode;


          path.replaceWith(instanceCode);
          declareGlobal(t, file, template.id, specCode);
        }
      },
      Program: {
        exit: function exit(path, _ref19) {
          var file = _ref19.file;

          var fileGlobals = globals.forFile(file);
          if (fileGlobals && Object.keys(fileGlobals).length) {
            file.path.unshiftContainer('body', t.variableDeclaration('var', Object.keys(fileGlobals).sort().map(function (key) {
              return t.variableDeclarator(fileGlobals[key], t.memberExpression(t.identifier('xvdom'), t.identifier(key)));
            })));
          }
        }
      }
    }
  };
};