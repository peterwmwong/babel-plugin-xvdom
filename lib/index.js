"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (_ref4) {
  var t = _ref4.types;

  return {
    visitor: {
      JSXOpeningElement: {
        exit: function exit(_ref5 /*, parent, scope, file */) {
          var node = _ref5.node;

          var key = undefined;
          var recycle = false;
          var props = node.attributes.length && node.attributes.reduce(function (props, attr) {
            var propName = attr.name.name;
            var value = transformProp(t, attr.value);

            if (propName === "key") {
              key = value;
            } else if (propName === "recycle") {
              recycle = true;
            } else if (value != null) {
              props[propName] = value;
            }

            return props;
          }, {});

          node.__xvdom_desc = {
            key: key,
            recycle: recycle,
            props: props,
            el: node.name.name
          };
        }
      },

      JSXClosingElement: {
        exit: function exit(path) {
          path.remove();
        }
      },

      JSXElement: {
        exit: function exit(path, state) {
          var node = path.node;
          var children = (0, _helpers.buildChildren)(t, node.children);
          var desc = node.openingElement.__xvdom_desc;
          desc.children = children;

          if (!t.isJSX(path.parent)) {
            path.replaceWith(createInstanceObject(t, state.file, desc));
          }
        }
      }
    }
  };
};

var _helpers = require("./helpers");

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var EMPTY_ARRAY = [];

function isComponentName(name) {
  return (/^[A-Z]/.test(name)
  );
}

function hasDynamicComponentProps(t, props) {
  return props && Object.keys(props).some(function (prop) {
    return isDynamic(t, props[prop]);
  });
}

function isDynamic(t, astNode) {
  if (t.isLiteral(astNode)) {
    return false;
  }
  if (t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)) {
    return isDynamic(t, astNode.left) || isDynamic(t, astNode.right);
  }
  if (t.isUnaryExpression(astNode)) {
    return isDynamic(t, astNode.argument);
  }
  return true;
}

function objProp(t, key, value) {
  key = t.isIdentifier(key) ? key : t.identifier(key);
  return t.objectProperty(key, value);
}

function transformProp(t, prop) {
  return t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression) : t.isJSXEmptyExpression(prop) ? null : t.isIdentifier(prop) || t.isMemberExpression(prop) ? (0, _helpers.toReference)(t, prop) : prop == null ? t.booleanLiteral(true) : prop;
}

function createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props) {
  if (!props) return [];
  var contextId = undefined;

  // >>> _n.prop1 = prop1Value;
  // >>> _n.prop2 = prop2Value;
  // >>> ...
  return Object.keys(props).reduce(function (acc, prop) {
    var value = props[prop];
    var dyn = undefined;
    var rhs = !isDynamic(t, value) ? value : t.memberExpression(instanceParamId, (dyn = genDynamicIdentifiers(value, prop, null, null, contextId)).valueId);

    return [].concat(_toConsumableArray(acc), _toConsumableArray(!contextId && dyn ? (contextId = dyn.contextId, [t.expressionStatement(t.assignmentExpression("=", t.memberExpression(instanceParamId, dyn.contextId), nodeId))]) : EMPTY_ARRAY), [t.expressionStatement(t.assignmentExpression("=", t.memberExpression(nodeId, t.identifier(prop)), rhs))]);
  }, []);
}

function createComponentCode(t, elCompName, props, instanceParamId, dynamicIds) {
  props = props || {};
  var componentPropMap = dynamicIds.componentPropMap;
  var objProps = Object.keys(props).map(function (prop) {
    return objProp(t, prop, isDynamic(t, props[prop]) ? t.memberExpression(instanceParamId, componentPropMap[prop].id) : props[prop]);
  });

  // >>> xvdom.createComponent(MyComponent, props, )
  return t.callExpression(t.memberExpression(t.identifier("xvdom"), t.identifier("createComponent")), [t.identifier(elCompName), objProps.length ? t.objectExpression(objProps) : t.nullLiteral(), instanceParamId, t.stringLiteral(dynamicIds.rerenderId.name), t.stringLiteral(dynamicIds.contextId.name), t.stringLiteral(dynamicIds.componentId.name)]);
}

function createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, parentId, children) {
  var result = { variableDeclarators: [], statements: [] };
  if (!children) return result;

  var tmpNodeId = undefined;
  return children.reduce(function (acc, child) {
    var createEl = undefined;
    if (t.isJSXElement(child)) {
      var _child$openingElement = child.openingElement.__xvdom_desc;
      var el = _child$openingElement.el;
      var props = _child$openingElement.props;
      var _children = _child$openingElement.children;

      var hasProps = props && Object.keys(props).length;
      var hasChildren = _children && _children.length;
      var isComponent = isComponentName(el);

      // >>> document.createElement("div")
      if (isComponent) {
        createEl = createComponentCode(t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props));
      } else {
        createEl = t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createElement")), [t.stringLiteral(el)]);
      }

      if (hasProps || hasChildren) {
        if (!tmpNodeId) {
          tmpNodeId = genUidIdentifier();
          acc.variableDeclarators.push(t.variableDeclarator(tmpNodeId));
        }

        acc.statements.push(
        // >>> _n = document.createElement("div")
        t.expressionStatement(t.assignmentExpression("=", tmpNodeId, createEl)));
        createEl = tmpNodeId;

        if (!isComponent && hasProps) {
          var _acc$statements;

          (_acc$statements = acc.statements).push.apply(_acc$statements, _toConsumableArray(createPropsStatements(t, instanceParamId, genDynamicIdentifiers, tmpNodeId, props)));
        }

        if (hasChildren) {
          var _acc$variableDeclarat, _acc$statements2;

          var _createElementsCode = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, tmpNodeId, _children);

          var variableDeclarators = _createElementsCode.variableDeclarators;
          var statements = _createElementsCode.statements;

          (_acc$variableDeclarat = acc.variableDeclarators).push.apply(_acc$variableDeclarat, _toConsumableArray(variableDeclarators));
          (_acc$statements2 = acc.statements).push.apply(_acc$statements2, _toConsumableArray(statements));
        }
      }
    } else if (isDynamic(t, child)) {
      var _genDynamicIdentifier = genDynamicIdentifiers(child);

      var valueId = _genDynamicIdentifier.valueId;
      var rerenderId = _genDynamicIdentifier.rerenderId;
      var contextId = _genDynamicIdentifier.contextId;

      // >>> xvdom.createDynamic(inst.v0, inst, "r0", "c0");

      createEl = t.callExpression(t.memberExpression(t.identifier("xvdom"), t.identifier("createDynamic")), [t.memberExpression(instanceParamId, valueId), instanceParamId, t.stringLiteral(rerenderId.name), t.stringLiteral(contextId.name)]);
    } else {
      createEl = t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createTextNode")), [t.logicalExpression("||", t.sequenceExpression([child]), t.stringLiteral(""))]);
    }

    acc.statements.push(
    // >>> parentNode.appendChild(...);
    t.expressionStatement(t.callExpression(t.memberExpression(parentId, t.identifier("appendChild")), [createEl])));
    return acc;
  }, result);
}

function createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, _ref) {
  var el = _ref.el;
  var props = _ref.props;
  var children = _ref.children;

  var nodeId = genUidIdentifier();
  var isComponent = isComponentName(el);

  // >>> document.createElement("div")
  var createEl = isComponent ? createComponentCode(t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props)) : t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createElement")), [t.stringLiteral(el)]);
  var propsStatements = isComponent ? EMPTY_ARRAY : createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props);

  var _createElementsCode2 = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, nodeId, children);

  var variableDeclarators = _createElementsCode2.variableDeclarators;
  var statements = _createElementsCode2.statements;

  return {
    variableDeclarators: [t.variableDeclarator(nodeId, createEl)].concat(_toConsumableArray(variableDeclarators)),
    statements: [].concat(_toConsumableArray(propsStatements), _toConsumableArray(statements))
  };
}

function createRenderFunction(t, genDynamicIdentifiers, rootElement) {
  var lastUidInt = 0;
  function genUidIdentifier() {
    return t.identifier(++lastUidInt === 1 ? "_n" : "_n" + lastUidInt);
  }
  var instanceParamId = t.identifier("inst");

  var _createRootElementCod = createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, rootElement);

  var variableDeclarators = _createRootElementCod.variableDeclarators;
  var statements = _createRootElementCod.statements;

  var params = genDynamicIdentifiers.dynamics.length ? [instanceParamId] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([t.variableDeclaration("var", variableDeclarators)].concat(_toConsumableArray(statements), [t.returnStatement(variableDeclarators[0].id)])));
}

function binarify(t, expressions) {
  return expressions.reduce(function (prevExp, exp) {
    return t.logicalExpression("||", exp, prevExp);
  }, expressions.pop());
}

function createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId) {
  var componentPropMap = dyn.componentPropMap;
  var dynamicProps = Object.keys(dyn.componentPropMap).filter(function (prop) {
    return isDynamic(t, dyn.componentPropMap[prop].value);
  });

  if (!dynamicProps.length) return;

  // >>> if (inst.v0 !== pInst.v0) {
  return t.ifStatement(binarify(t, dynamicProps.map(function (prop) {
    return t.binaryExpression("!==", t.memberExpression(instanceParamId, componentPropMap[prop].id), t.memberExpression(prevInstanceParamId, componentPropMap[prop].id));
  })), t.blockStatement([t.expressionStatement(t.callExpression(t.memberExpression(prevInstanceParamId, dyn.rerenderId), [t.identifier(dyn.componentName), t.objectExpression(Object.keys(dyn.componentPropMap).map(function (prop) {
    var _componentPropMap$pro = componentPropMap[prop];
    var id = _componentPropMap$pro.id;
    var value = _componentPropMap$pro.value;

    return objProp(t, prop, isDynamic(t, value) ? t.memberExpression(instanceParamId, id) : value);
  })), t.identifier("null"), t.memberExpression(prevInstanceParamId, dyn.componentId), t.memberExpression(prevInstanceParamId, dyn.contextId), prevInstanceParamId, t.stringLiteral(dyn.contextId.name), t.stringLiteral(dyn.componentId.name)]))].concat(_toConsumableArray(dynamicProps.map(function (prop) {
    return t.expressionStatement(t.assignmentExpression("=", t.memberExpression(prevInstanceParamId, componentPropMap[prop].id), t.memberExpression(instanceParamId, componentPropMap[prop].id)));
  })))));
}

function createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId) {
  // >>> if (inst.v0 !== pInst.v0) {
  return t.ifStatement(t.binaryExpression("!==", t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId)), t.blockStatement(dyn.prop ? [t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)), t.memberExpression(instanceParamId, dyn.valueId))),

  // >>> pInst.v0 = inst.v0;
  t.expressionStatement(t.assignmentExpression("=", t.memberExpression(prevInstanceParamId, dyn.valueId), t.memberExpression(instanceParamId, dyn.valueId)))] : [
  // >>> pInst.v0 = pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
  t.expressionStatement(t.assignmentExpression("=", t.memberExpression(prevInstanceParamId, dyn.valueId), t.callExpression(t.memberExpression(prevInstanceParamId, dyn.rerenderId), [t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.contextId), prevInstanceParamId, t.stringLiteral(dyn.rerenderId.name), t.stringLiteral(dyn.contextId.name)])))]));
}

function createRerenderFunction(t, dynamics) {
  var instanceParamId = t.identifier("inst");
  var prevInstanceParamId = t.identifier("pInst");
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement(dynamics.reduce(function (statements, dyn) {
    return [].concat(_toConsumableArray(statements), [dyn.isComponent ? createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId) : createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId)]);
  }, [])));
}

function createSpecObject(t, file, genDynamicIdentifiers, desc) {
  var specId = file.scope.generateUidIdentifier("xvdomSpec");
  var specProperties = [objProp(t, "render", createRenderFunction(t, genDynamicIdentifiers, desc))];
  var dynamics = genDynamicIdentifiers.dynamics.filter(function (dyn) {
    return !dyn.isComponent || dyn.hasDynamicComponentProps;
  });

  specProperties.push(objProp(t, "rerender", dynamics.length ? createRerenderFunction(t, dynamics) : t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY))));

  if (desc.recycle) specProperties.push(objProp(t, "recycled", t.arrayExpression([])));

  file.path.unshiftContainer("body", t.variableDeclaration("var", [t.variableDeclarator(specId, t.objectExpression(specProperties))]));
  return specId;
}

function genComponentPropIdentifierMap(t, props, idInt) {
  if (!props) return null;

  var map = {};
  for (var prop in props) {
    map = map || {};
    map[prop] = { id: t.identifier("p" + idInt + prop), value: props[prop] };
  }
  return map;
}

function instancePropsForComponent(t, _ref2) {
  var componentId = _ref2.componentId;
  var componentPropMap = _ref2.componentPropMap;

  return [objProp(t, componentId, t.identifier("null"))].concat(_toConsumableArray(!componentPropMap ? EMPTY_ARRAY : Object.keys(componentPropMap).filter(function (prop) {
    return isDynamic(t, componentPropMap[prop].value);
  }).map(function (prop) {
    var _componentPropMap$pro2 = componentPropMap[prop];
    var id = _componentPropMap$pro2.id;
    var value = _componentPropMap$pro2.value;

    return objProp(t, id, value);
  })));
}

function createInstanceObject(t, file, desc) {
  var nullId = t.identifier("null");
  var dynamics = [];

  var lastDynamicUidInt = 0;
  function genDynamicIdentifiers(value, prop, componentName, componentProps, contextId) {
    var idInt = lastDynamicUidInt++;
    var isComponent = !!componentName;
    var componentPropMap = genComponentPropIdentifierMap(t, componentProps, idInt);
    var _hasDynamicComponentProps = hasDynamicComponentProps(t, componentProps);
    var result = {
      prop: prop,
      value: value,
      isComponent: isComponent,
      componentName: componentName,
      componentPropMap: componentPropMap,
      hasDynamicComponentProps: _hasDynamicComponentProps,
      valueId: isComponent ? null : t.identifier("v" + idInt),
      rerenderId: t.identifier("r" + idInt),
      contextId: contextId || t.identifier("c" + idInt),
      componentId: t.identifier("w" + idInt)
    };
    dynamics.push(result);
    return result;
  }
  genDynamicIdentifiers.dynamics = dynamics;

  var specObject = createSpecObject(t, file, genDynamicIdentifiers, desc);
  var usedContextIds = {};
  var instancePropsForDynamics = dynamics.reduce(function (props, _ref3) {
    var isComponent = _ref3.isComponent;
    var value = _ref3.value;
    var valueId = _ref3.valueId;
    var rerenderId = _ref3.rerenderId;
    var contextId = _ref3.contextId;
    var componentId = _ref3.componentId;
    var componentPropMap = _ref3.componentPropMap;
    return [].concat(_toConsumableArray(props), _toConsumableArray(valueId ? [objProp(t, valueId, value)] : EMPTY_ARRAY), [objProp(t, rerenderId, nullId)], _toConsumableArray(!usedContextIds[contextId.name] ? (usedContextIds[contextId.name] = true, [objProp(t, contextId, nullId)]) : EMPTY_ARRAY), _toConsumableArray(isComponent ? instancePropsForComponent(t, { componentPropMap: componentPropMap, componentId: componentId }) : EMPTY_ARRAY));
  }, []);

  var objectProps = [objProp(t, "spec", specObject), objProp(t, "_node", t.identifier("null")), objProp(t, "component", t.identifier("null")), objProp(t, "state", t.identifier("null")), objProp(t, "actions", t.identifier("null")), objProp(t, "props", t.identifier("null"))].concat(_toConsumableArray(instancePropsForDynamics));

  if (desc.key) objectProps.push(objProp(t, "key", desc.key));

  return t.objectExpression(objectProps);
}