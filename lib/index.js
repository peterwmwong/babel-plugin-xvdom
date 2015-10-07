"use strict";

exports.__esModule = true;

var _helpers = require("./helpers");

function isDynamic(t, astNode) {
  return t.isIdentifier(astNode) || t.isBinaryExpression(astNode) || t.isCallExpression(astNode);
}

function objProp(t, key, value) {
  key = t.isIdentifier(key) ? key : t.identifier(key);
  return t.property("init", key, value);
}

function transformProp(_x, _x2) {
  var _again = true;

  _function: while (_again) {
    var t = _x,
        prop = _x2;
    _again = false;

    if (t.isJSXExpressionContainer(prop)) {
      _x = t;
      _x2 = prop.expression;
      _again = true;
      continue _function;
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
  return Object.keys(props).map(function (prop) {
    var value = props[prop];
    var rhs = !isDynamic(t, value) ? value : t.memberExpression(instanceParamId, genDynamicIdentifiers(value, prop).valueId);

    return t.expressionStatement(t.assignmentExpression("=", t.memberExpression(nodeId, t.identifier(prop)), rhs));
  });
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

      // >>> document.createElement("div")
      createEl = t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createElement")), [t.literal(el)]);

      if (hasProps || hasChildren) {
        var _acc$statements;

        if (!tmpNodeId) {
          tmpNodeId = genUidIdentifier();
          acc.variableDeclarators.push(tmpNodeId);
        }

        acc.statements.push(
        // >>> _n = document.createElement("div")
        t.expressionStatement(t.assignmentExpression("=", tmpNodeId, createEl)));
        createEl = tmpNodeId;

        if (hasProps) (_acc$statements = acc.statements).push.apply(_acc$statements, createPropsStatements(t, instanceParamId, genDynamicIdentifiers, tmpNodeId, props));

        if (hasChildren) {
          var _acc$variableDeclarators, _acc$statements2;

          var _createElementsCode = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, tmpNodeId, _children);

          var variableDeclarators = _createElementsCode.variableDeclarators;
          var statements = _createElementsCode.statements;

          (_acc$variableDeclarators = acc.variableDeclarators).push.apply(_acc$variableDeclarators, variableDeclarators);
          (_acc$statements2 = acc.statements).push.apply(_acc$statements2, statements);
        }
      }
    } else {
      var _genDynamicIdentifiers = genDynamicIdentifiers(child);

      var valueId = _genDynamicIdentifiers.valueId;
      var rerenderId = _genDynamicIdentifiers.rerenderId;
      var contextId = _genDynamicIdentifiers.contextId;

      // >>> xvdom.createDynamic(inst.v0, inst, "r0", "c0");
      createEl = t.callExpression(t.memberExpression(t.identifier("xvdom"), t.identifier("createDynamic")), [t.memberExpression(instanceParamId, valueId), instanceParamId, t.literal(rerenderId.name), t.literal(contextId.name)]);
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

  // >>> document.createElement("div")
  var createEl = t.callExpression(t.memberExpression(t.identifier("document"), t.identifier("createElement")), [t.literal(el)]);
  var propsStatements = createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props);

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

function createRerenderFunction(t, dynamics) {
  var instanceParamId = t.identifier("inst");
  var prevInstanceParamId = t.identifier("pInst");
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement(dynamics.reduce(function (statements, dyn) {
    return [].concat(statements, [

    // >>> if (inst.v0 !== pInst.v0) {
    t.ifStatement(t.logicalExpression("!==", t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId)), t.blockStatement([

    // >>> pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
    t.expressionStatement(dyn.prop ? t.assignmentExpression("=", t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)), t.memberExpression(instanceParamId, dyn.valueId)) : t.callExpression(t.memberExpression(prevInstanceParamId, dyn.rerenderId), [t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.contextId), prevInstanceParamId, t.literal(dyn.rerenderId.name), t.literal(dyn.contextId.name)])),

    // >>> pInst.v0 = inst.v0;
    t.expressionStatement(t.assignmentExpression("=", t.memberExpression(prevInstanceParamId, dyn.valueId), t.memberExpression(instanceParamId, dyn.valueId)))]))]);
  }, [])));
}

function createSpecObject(t, file, genDynamicIdentifiers, desc) {
  var specId = file.scope.generateUidIdentifier("xvdomSpec");
  var dynamics = genDynamicIdentifiers.dynamics;
  var specProperties = [objProp(t, "render", createRenderFunction(t, genDynamicIdentifiers, desc))];

  if (dynamics.length) {
    specProperties.push(objProp(t, "rerender", createRerenderFunction(t, dynamics)));
  }

  file.path.unshiftContainer("body", t.variableDeclaration("var", [t.variableDeclarator(specId, t.objectExpression(specProperties))]));
  return specId;
}

function createInstanceObject(t, file, desc) {
  var nullId = t.identifier("null");
  var dynamics = [];

  var lastDynamicUidInt = 0;
  function genDynamicIdentifiers(value, prop) {
    var idInt = lastDynamicUidInt++;
    var result = {
      prop: prop,
      value: value,
      valueId: t.identifier("v" + idInt),
      rerenderId: t.identifier("r" + idInt),
      contextId: t.identifier("c" + idInt)
    };
    dynamics.push(result);
    return result;
  }
  genDynamicIdentifiers.dynamics = dynamics;

  var specObject = createSpecObject(t, file, genDynamicIdentifiers, desc);
  var instancePropsForDynamics = dynamics.reduce(function (props, _ref2) {
    var value = _ref2.value;
    var valueId = _ref2.valueId;
    var rerenderId = _ref2.rerenderId;
    var contextId = _ref2.contextId;
    return [].concat(props, [objProp(t, valueId, value), objProp(t, rerenderId, nullId), objProp(t, contextId, nullId)]);
  }, []);

  var objectProps = [objProp(t, "spec", specObject), objProp(t, "_node", t.identifier("null"))].concat(instancePropsForDynamics);

  if (desc.key) objectProps.push(objProp(t, "key", desc.key));

  return t.objectExpression(objectProps);
}

exports["default"] = function (_ref3) {
  var Plugin = _ref3.Plugin;
  var t = _ref3.types;

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