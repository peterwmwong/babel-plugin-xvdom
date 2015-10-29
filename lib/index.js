"use strict";

exports.__esModule = true;

var _helpers = require("./helpers");

function isComponentName(name) {
  return (/[A-Z]/.test(name[0])
  );
}

function hasDynamicComponentProps(t, props) {
  return props && Object.keys(props).some(function (prop) {
    return isDynamic(t, props[prop]);
  });
}

function isDynamic(_x, _x2) {
  var _left;

  var _again = true;

  _function: while (_again) {
    var t = _x,
        astNode = _x2;
    _again = false;

    if (t.isLiteral(astNode)) {
      return false;
    } else if (t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)) {
      if (_left = isDynamic(t, astNode.left)) {
        return _left;
      }

      _x = t;
      _x2 = astNode.right;
      _again = true;
      continue _function;
    } else if (t.isUnaryExpression(astNode)) {
      _x = t;
      _x2 = astNode.argument;
      _again = true;
      continue _function;
    }
    return true;
  }
}

function objProp(t, key, value) {
  key = t.isIdentifier(key) ? key : t.identifier(key);
  return t.property("init", key, value);
}

function transformProp(_x3, _x4) {
  var _again2 = true;

  _function2: while (_again2) {
    var t = _x3,
        prop = _x4;
    _again2 = false;

    if (t.isJSXExpressionContainer(prop)) {
      _x3 = t;
      _x4 = prop.expression;
      _again2 = true;
      continue _function2;
    } else {
      return t.isJSXEmptyExpression(prop) ? null : t.isIdentifier(prop) || t.isMemberExpression(prop) ? _helpers.toReference(t, prop) : prop == null ? t.literal(true) : prop;
    }
  }
}

function createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props) {
  if (!props) return [];

  // >>> _n.prop1 = prop1Value;
  // >>> _n.prop2 = prop2Value;
  // >>> ...
  return Object.keys(props).reduce(function (acc, prop) {
    var value = props[prop];
    var dyn = undefined;
    var rhs = !isDynamic(t, value) ? value : t.memberExpression(instanceParamId, (dyn = genDynamicIdentifiers(value, prop)).valueId);
    return [].concat(acc, dyn ? [t.expressionStatement(t.assignmentExpression("=", t.memberExpression(instanceParamId, dyn.contextId), nodeId))] : [], [t.expressionStatement(t.assignmentExpression("=", t.memberExpression(nodeId, t.identifier(prop)), rhs))]);
  }, []);
}

function createComponentCode(t, elCompName, props, instanceParamId, dynamicIds) {
  props = props || {};
  var componentPropMap = dynamicIds.componentPropMap;
  var objProps = Object.keys(props).map(function (prop) {
    return objProp(t, prop, isDynamic(t, props[prop]) ? t.memberExpression(instanceParamId, componentPropMap[prop].id) : props[prop]);
  });

  // >>> xvdom.createComponent(MyComponent, props, )
  return t.callExpression(t.memberExpression(t.identifier("xvdom"), t.identifier("createComponent")), [t.identifier(elCompName), objProps.length ? t.objectExpression(objProps) : t.literal(null), instanceParamId, t.literal(dynamicIds.rerenderId.name), t.literal(dynamicIds.contextId.name), t.literal(dynamicIds.componentId.name)]);
}

function createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, parentId, children) {
  var result = { variableDeclarators: [], statements: [] };
  if (!children) return result;

  var tmpNodeId = undefined;
  return children.reduce(function (acc, child) {
    var createEl = undefined;
    if (t.isJSXElement(child)) {
      var _child$openingElement$__xvdom_desc = child.openingElement.__xvdom_desc;
      var el = _child$openingElement$__xvdom_desc.el;
      var props = _child$openingElement$__xvdom_desc.props;
      var _children = _child$openingElement$__xvdom_desc.children;

      var hasProps = props && Object.keys(props).length;
      var hasChildren = _children && _children.length;
      var isComponent = isComponentName(el);

      // >>> document.createElement("div")
      if (isComponent) {
        createEl = createComponentCode(t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props));
      } else {
        createEl = t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createElement")), [t.literal(el)]);
      }

      if (hasProps || hasChildren) {
        if (!tmpNodeId) {
          tmpNodeId = genUidIdentifier();
          acc.variableDeclarators.push(tmpNodeId);
        }

        acc.statements.push(
        // >>> _n = document.createElement("div")
        t.expressionStatement(t.assignmentExpression("=", tmpNodeId, createEl)));
        createEl = tmpNodeId;

        if (!isComponent && hasProps) {
          var _acc$statements;

          (_acc$statements = acc.statements).push.apply(_acc$statements, createPropsStatements(t, instanceParamId, genDynamicIdentifiers, tmpNodeId, props));
        }

        if (hasChildren) {
          var _acc$variableDeclarators, _acc$statements2;

          var _createElementsCode = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, tmpNodeId, _children);

          var variableDeclarators = _createElementsCode.variableDeclarators;
          var statements = _createElementsCode.statements;

          (_acc$variableDeclarators = acc.variableDeclarators).push.apply(_acc$variableDeclarators, variableDeclarators);
          (_acc$statements2 = acc.statements).push.apply(_acc$statements2, statements);
        }
      }
    } else if (isDynamic(t, child)) {
      var _genDynamicIdentifiers = genDynamicIdentifiers(child);

      var valueId = _genDynamicIdentifiers.valueId;
      var rerenderId = _genDynamicIdentifiers.rerenderId;
      var contextId = _genDynamicIdentifiers.contextId;

      // >>> xvdom.createDynamic(inst.v0, inst, "r0", "c0");
      createEl = t.callExpression(t.memberExpression(t.identifier("xvdom"), t.identifier("createDynamic")), [t.memberExpression(instanceParamId, valueId), instanceParamId, t.literal(rerenderId.name), t.literal(contextId.name)]);
    } else {
      createEl = t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createTextNode")), [t.logicalExpression("||", t.sequenceExpression([child]), t.literal(""))]);
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
  var createEl = isComponent ? createComponentCode(t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props)) : t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createElement")), [t.literal(el)]);
  var propsStatements = isComponent ? [] : createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props);

  var _createElementsCode2 = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, nodeId, children);

  var variableDeclarators = _createElementsCode2.variableDeclarators;
  var statements = _createElementsCode2.statements;

  return {
    variableDeclarators: [t.variableDeclarator(nodeId, createEl)].concat(variableDeclarators),
    statements: [].concat(propsStatements, statements)
  };
}

function createRenderFunction(t, genDynamicIdentifiers, rootElement) {
  var lastUidInt = 0;
  function genUidIdentifier() {
    return t.identifier(++lastUidInt === 1 ? "_n" : "_n" + lastUidInt);
  }
  var instanceParamId = t.identifier("inst");

  var _createRootElementCode = createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, rootElement);

  var variableDeclarators = _createRootElementCode.variableDeclarators;
  var statements = _createRootElementCode.statements;

  var params = genDynamicIdentifiers.dynamics.length ? [instanceParamId] : [];

  return t.functionExpression(null, params, t.blockStatement([t.variableDeclaration("var", variableDeclarators)].concat(statements, [t.returnStatement(variableDeclarators[0].id)])));
}

function binarify(t, expressions) {
  return expressions.reduce(function (prevExp, exp) {
    return t.binaryExpression("||", exp, prevExp);
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
    return t.logicalExpression("!==", t.memberExpression(instanceParamId, componentPropMap[prop].id), t.memberExpression(prevInstanceParamId, componentPropMap[prop].id));
  })), t.blockStatement([t.expressionStatement(t.callExpression(t.memberExpression(prevInstanceParamId, dyn.rerenderId), [t.identifier(dyn.componentName), t.objectExpression(Object.keys(dyn.componentPropMap).map(function (prop) {
    var _componentPropMap$prop = componentPropMap[prop];
    var id = _componentPropMap$prop.id;
    var value = _componentPropMap$prop.value;

    return objProp(t, prop, isDynamic(t, value) ? t.memberExpression(instanceParamId, id) : value);
  })), t.identifier("null"), t.memberExpression(prevInstanceParamId, dyn.componentId), t.memberExpression(prevInstanceParamId, dyn.contextId), prevInstanceParamId, t.literal(dyn.contextId.name), t.literal(dyn.componentId.name)]))].concat(dynamicProps.map(function (prop) {
    return t.expressionStatement(t.assignmentExpression("=", t.memberExpression(prevInstanceParamId, componentPropMap[prop].id), t.memberExpression(instanceParamId, componentPropMap[prop].id)));
  }))));
}

function createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId) {
  // >>> if (inst.v0 !== pInst.v0) {
  return t.ifStatement(t.logicalExpression("!==", t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId)), t.blockStatement(dyn.prop ? [t.expressionStatement(t.assignmentExpression("=", t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)), t.memberExpression(instanceParamId, dyn.valueId))),

  // >>> pInst.v0 = inst.v0;
  t.expressionStatement(t.assignmentExpression("=", t.memberExpression(prevInstanceParamId, dyn.valueId), t.memberExpression(instanceParamId, dyn.valueId)))] : [
  // >>> pInst.v0 = pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
  t.expressionStatement(t.assignmentExpression("=", t.memberExpression(prevInstanceParamId, dyn.valueId), t.callExpression(t.memberExpression(prevInstanceParamId, dyn.rerenderId), [t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.contextId), prevInstanceParamId, t.literal(dyn.rerenderId.name), t.literal(dyn.contextId.name)])))]));
}

function createRerenderFunction(t, dynamics) {
  var instanceParamId = t.identifier("inst");
  var prevInstanceParamId = t.identifier("pInst");
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement(dynamics.reduce(function (statements, dyn) {
    return [].concat(statements, [dyn.isComponent ? createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId) : createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId)]);
  }, [])));
}

function createSpecObject(t, file, genDynamicIdentifiers, desc) {
  var specId = file.scope.generateUidIdentifier("xvdomSpec");
  var specProperties = [objProp(t, "render", createRenderFunction(t, genDynamicIdentifiers, desc))];
  var dynamics = genDynamicIdentifiers.dynamics.filter(function (dyn) {
    return !dyn.isComponent || dyn.hasDynamicComponentProps;
  });

  if (dynamics.length) {
    specProperties.push(objProp(t, "rerender", createRerenderFunction(t, dynamics)));
  }

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

  return [objProp(t, componentId, t.identifier("null"))].concat(!componentPropMap ? [] : Object.keys(componentPropMap).filter(function (prop) {
    return isDynamic(t, componentPropMap[prop].value);
  }).map(function (prop) {
    var _componentPropMap$prop2 = componentPropMap[prop];
    var id = _componentPropMap$prop2.id;
    var value = _componentPropMap$prop2.value;

    return objProp(t, id, value);
  }));
}

function createInstanceObject(t, file, desc) {
  var nullId = t.identifier("null");
  var dynamics = [];

  var lastDynamicUidInt = 0;
  function genDynamicIdentifiers(value, prop, componentName, componentProps) {
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
      contextId: t.identifier("c" + idInt),
      componentId: t.identifier("w" + idInt)
    };
    dynamics.push(result);
    return result;
  }
  genDynamicIdentifiers.dynamics = dynamics;

  var specObject = createSpecObject(t, file, genDynamicIdentifiers, desc);
  var instancePropsForDynamics = dynamics.reduce(function (props, _ref3) {
    var isComponent = _ref3.isComponent;
    var value = _ref3.value;
    var valueId = _ref3.valueId;
    var rerenderId = _ref3.rerenderId;
    var contextId = _ref3.contextId;
    var componentId = _ref3.componentId;
    var componentPropMap = _ref3.componentPropMap;
    return [].concat(props, valueId ? [objProp(t, valueId, value)] : [], [objProp(t, rerenderId, nullId), objProp(t, contextId, nullId)], isComponent ? instancePropsForComponent(t, { componentPropMap: componentPropMap, componentId: componentId }) : []);
  }, []);

  var objectProps = [objProp(t, "spec", specObject), objProp(t, "_node", t.identifier("null")), objProp(t, "component", t.identifier("null")), objProp(t, "state", t.identifier("null")), objProp(t, "actions", t.identifier("null")), objProp(t, "props", t.identifier("null"))].concat(instancePropsForDynamics);

  if (desc.key) objectProps.push(objProp(t, "key", desc.key));

  return t.objectExpression(objectProps);
}

exports["default"] = function (_ref4) {
  var Plugin = _ref4.Plugin;
  var t = _ref4.types;

  return new Plugin("xvdom", {
    visitor: {
      JSXOpeningElement: {
        exit: function exit(node /*, parent, scope, file */) {
          var key = undefined;
          var props = node.attributes.length && node.attributes.reduce(function (props, attr) {
            var propName = attr.name.name;
            var value = transformProp(t, attr.value);

            if (propName === "key") {
              key = value;
            } else if (value != null) {
              props[propName] = value;
            }

            return props;
          }, {});

          node.__xvdom_desc = {
            key: key,
            props: props,
            el: node.name.name
          };
          return node;
        }
      },

      JSXClosingElement: {
        exit: function exit() {
          return this.dangerouslyRemove();
        }
      },

      JSXElement: {
        exit: function exit(node, parent, scope, file) {
          var children = _helpers.buildChildren(t, node.children);
          var desc = node.openingElement.__xvdom_desc;
          desc.children = children;

          if (t.isJSX(parent)) return node;
          return createInstanceObject(t, file, desc);
        }
      }
    }
  });
};

module.exports = exports["default"];

// >>> pInst.p0prop = inst.p0prop;