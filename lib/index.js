'use strict';

exports.__esModule = true;

exports.default = function (_ref4) {
  var t = _ref4.types;

  return {
    visitor: {
      JSXOpeningElement: {
        exit: function exit(_ref5 /*, parent, scope, file */) {
          var node = _ref5.node;

          var key = void 0;
          var recycle = false;
          var props = node.attributes.length && node.attributes.reduce(function (props, attr) {
            var propName = attr.name.name;
            var value = transformProp(t, attr.value);

            if (propName === 'key') {
              key = value;
            } else if (propName === 'recycle') {
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

var _helpers = require('./helpers');

var _genId = require('./genId');

var _genId2 = _interopRequireDefault(_genId);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EMPTY_ARRAY = [];

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

function transformProp(t, prop) {
  return t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression) : t.isJSXEmptyExpression(prop) ? null : t.isIdentifier(prop) || t.isMemberExpression(prop) ? (0, _helpers.toReference)(t, prop) : prop == null ? t.booleanLiteral(true) : prop;
}

function createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props, elementName) {
  if (!props) return [];
  var contextId = void 0;

  // >>> _n.prop1 = prop1Value;
  // >>> _n.prop2 = prop2Value;
  // >>> ...
  return Object.keys(props).reduce(function (acc, prop) {
    var value = props[prop];
    var dyn = void 0;
    var rhs = !isDynamic(t, value) ? value : t.memberExpression(instanceParamId, (dyn = genDynamicIdentifiers(value, prop, elementName, null, contextId)).valueId);

    return [].concat(acc, !contextId && dyn ? (contextId = dyn.contextId, [t.expressionStatement(t.assignmentExpression('=', t.memberExpression(instanceParamId, dyn.contextId), nodeId))]) : EMPTY_ARRAY, [t.expressionStatement(t.assignmentExpression('=', t.memberExpression(nodeId, t.identifier(prop)), rhs))]);
  }, []);
}

function createComponentCode(t, elCompName, props, instanceParamId, dynamicIds) {
  props = props || {};
  var componentPropMap = dynamicIds.componentPropMap;
  var componentObjProps = Object.keys(props).map(function (prop) {
    return objProp(t, prop, isDynamic(t, props[prop]) ? t.memberExpression(instanceParamId, componentPropMap[prop].id) : props[prop]);
  });

  // >>> xvdom.createComponent(MyComponent, MyComponent.state, props, instance, rerenderProp, contextProp, componentInstanceProp)
  return t.callExpression(t.memberExpression(t.identifier('xvdom'), t.identifier('createComponent')), [t.identifier(elCompName), t.memberExpression(t.identifier(elCompName), t.identifier('state')), componentObjProps.length ? t.objectExpression(componentObjProps) : t.nullLiteral(), instanceParamId, t.stringLiteral(dynamicIds.rerenderId.name), t.stringLiteral(dynamicIds.contextId.name), t.stringLiteral(dynamicIds.componentId.name)]);
}

function createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, parentId, children) {
  var result = { variableDeclarators: [], statements: [] };
  if (!children) return result;

  var tmpNodeId = void 0;
  var isOnlyChild = children.length === 1;
  return children.reduce(function (acc, child) {
    var createEl = void 0;
    if (t.isJSXElement(child)) {
      var _child$openingElement = child.openingElement.__xvdom_desc;
      var el = _child$openingElement.el;
      var props = _child$openingElement.props;
      var _children = _child$openingElement.children;

      var hasProps = props && Object.keys(props).length;
      var hasChildren = _children && _children.length;
      var isComponent = isComponentName(el);

      // >>> document.createElement('div')
      if (isComponent) {
        createEl = createComponentCode(t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props));
      } else {
        createEl = t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('createElement')), [t.stringLiteral(el)]);
      }

      if (hasProps || hasChildren) {
        if (!tmpNodeId) {
          tmpNodeId = genUidIdentifier();
          acc.variableDeclarators.push(t.variableDeclarator(tmpNodeId));
        }

        acc.statements.push(
        // >>> _n = document.createElement('div')
        t.expressionStatement(t.assignmentExpression('=', tmpNodeId, createEl)));
        createEl = tmpNodeId;

        if (!isComponent && hasProps) {
          var _acc$statements;

          (_acc$statements = acc.statements).push.apply(_acc$statements, createPropsStatements(t, instanceParamId, genDynamicIdentifiers, tmpNodeId, props, el));
        }

        if (hasChildren) {
          var _acc$variableDeclarat, _acc$statements2;

          var _createElementsCode = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, tmpNodeId, _children);

          var variableDeclarators = _createElementsCode.variableDeclarators;
          var statements = _createElementsCode.statements;


          (_acc$variableDeclarat = acc.variableDeclarators).push.apply(_acc$variableDeclarat, variableDeclarators);
          (_acc$statements2 = acc.statements).push.apply(_acc$statements2, statements);
        }
      }
    } else if (isDynamic(t, child)) {
      var _genDynamicIdentifier = genDynamicIdentifiers(child, null /*prop*/
      , null /*componentName*/
      , null /*componentProps*/
      , null /*contextId*/
      , isOnlyChild);

      var valueId = _genDynamicIdentifier.valueId;
      var rerenderId = _genDynamicIdentifier.rerenderId;
      var contextId = _genDynamicIdentifier.contextId;

      // >>> xvdom.createDynamic(inst.v0, inst, 'r0', 'c0');

      createEl = t.callExpression(t.memberExpression(t.identifier('xvdom'), t.identifier('createDynamic')), [t.booleanLiteral(isOnlyChild), parentId, t.memberExpression(instanceParamId, valueId), instanceParamId, t.stringLiteral(rerenderId.name), t.stringLiteral(contextId.name)]);
    } else {
      createEl = t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('createTextNode')), [t.logicalExpression('||', t.sequenceExpression([child]), t.stringLiteral(''))]);
    }

    acc.statements.push(
    // >>> parentNode.appendChild(...);
    t.expressionStatement(t.callExpression(t.memberExpression(parentId, t.identifier('appendChild')), [createEl])));
    return acc;
  }, result);
}

function createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, _ref) {
  var el = _ref.el;
  var props = _ref.props;
  var children = _ref.children;

  var nodeId = genUidIdentifier();
  var isComponent = isComponentName(el);

  // >>> document.createElement('div')
  var createEl = isComponent ? createComponentCode(t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props)) : t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('createElement')), [t.stringLiteral(el)]);
  var propsStatements = isComponent ? EMPTY_ARRAY : createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props, el);

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
  var instanceParamId = t.identifier('inst');
  var genUidIdentifier = function genUidIdentifier() {
    return t.identifier('_n' + (++lastUidInt === 1 ? '' : lastUidInt));
  };

  var _createRootElementCod = createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, rootElement);

  var variableDeclarators = _createRootElementCod.variableDeclarators;
  var statements = _createRootElementCod.statements;

  var params = genDynamicIdentifiers.dynamics.length ? [instanceParamId] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([t.variableDeclaration('var', variableDeclarators)].concat(statements, [t.returnStatement(variableDeclarators[0].id)])));
}

function binarify(t, expressions) {
  return expressions.reduce(function (prevExp, exp) {
    return t.logicalExpression('||', exp, prevExp);
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
    return t.binaryExpression('!==', t.memberExpression(instanceParamId, componentPropMap[prop].id), t.memberExpression(prevInstanceParamId, componentPropMap[prop].id));
  })), t.blockStatement([t.expressionStatement(t.callExpression(t.memberExpression(prevInstanceParamId, dyn.rerenderId), [t.identifier(dyn.componentName), t.objectExpression(Object.keys(dyn.componentPropMap).map(function (prop) {
    var _componentPropMap$pro = componentPropMap[prop];
    var id = _componentPropMap$pro.id;
    var value = _componentPropMap$pro.value;

    return objProp(t, prop, isDynamic(t, value) ? t.memberExpression(instanceParamId, id) : value);
  })), t.nullLiteral(), t.memberExpression(prevInstanceParamId, dyn.componentId), t.memberExpression(prevInstanceParamId, dyn.contextId), prevInstanceParamId, t.stringLiteral(dyn.contextId.name), t.stringLiteral(dyn.componentId.name)]))].concat(dynamicProps.map(function (prop) {
    return t.expressionStatement(t.assignmentExpression('=', t.memberExpression(prevInstanceParamId, componentPropMap[prop].id), t.memberExpression(instanceParamId, componentPropMap[prop].id)));
  }))));
}

function createPropAssignmentStatement(t, prevInstanceParamId, tempVarId, dyn) {
  var assignStmt = t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)), tempVarId));

  if (dyn.componentName === 'input' && dyn.prop === 'value') {
    return t.ifStatement(t.binaryExpression('!==', t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)), tempVarId), t.blockStatement([assignStmt]));
  } else {
    return assignStmt;
  }
}

function createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId, tempVarId) {
  return [].concat(dyn.prop ? [t.expressionStatement(t.assignmentExpression('=', tempVarId, t.memberExpression(instanceParamId, dyn.valueId)))] : [], [

  // >>> if (inst.v0 !== pInst.v0) {
  t.ifStatement(t.binaryExpression('!==', dyn.prop ? tempVarId : t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId)), t.blockStatement(dyn.prop ? [createPropAssignmentStatement(t, prevInstanceParamId, tempVarId, dyn),

  // >>> pInst.v0 = inst.v0;
  t.expressionStatement(t.assignmentExpression('=', t.memberExpression(prevInstanceParamId, dyn.valueId), tempVarId))] : [
  // >>> pInst.v0 = pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, 'r0', 'c0');
  t.expressionStatement(t.assignmentExpression('=', t.memberExpression(prevInstanceParamId, dyn.valueId), t.callExpression(t.memberExpression(prevInstanceParamId, dyn.rerenderId), [t.booleanLiteral(dyn.isOnlyChild), t.memberExpression(instanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.valueId), t.memberExpression(prevInstanceParamId, dyn.contextId), prevInstanceParamId, t.stringLiteral(dyn.rerenderId.name), t.stringLiteral(dyn.contextId.name)])))]))]);
}

function createRerenderFunction(t, dynamics) {
  var instanceParamId = t.identifier('inst');
  var prevInstanceParamId = t.identifier('pInst');
  var tempVarId = t.identifier('v');
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement([t.variableDeclaration('var', [t.variableDeclarator(tempVarId)])].concat(dynamics.reduce(function (acc, dyn) {
    return [].concat(acc, dyn.isComponent ? [createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId)] : createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId, tempVarId));
  }, []))));
}

function createSpecObject(t, file, genDynamicIdentifiers, desc) {
  var specId = file.scope.generateUidIdentifier('xvdomSpec');
  var xvdomId = t.identifier('xvdom');
  var renderFunc = createRenderFunction(t, genDynamicIdentifiers, desc);
  var dynamics = genDynamicIdentifiers.dynamics.filter(function (dyn) {
    return !dyn.isComponent || dyn.hasDynamicComponentProps;
  });

  var specProperties = objProps(t, {
    c: renderFunc,
    u: dynamics.length ? createRerenderFunction(t, dynamics) : t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY)),
    r: desc.recycle ? t.newExpression(t.memberExpression(xvdomId, t.identifier('Pool')), EMPTY_ARRAY) : t.memberExpression(xvdomId, t.identifier('DEADPOOL'))
  });

  file.path.unshiftContainer('body', t.variableDeclaration('var', [t.variableDeclarator(specId, t.objectExpression(specProperties))]));
  return specId;
}

function getComponentDescriptor(t, props, idInt) {
  var nextIdInt = idInt;
  var componentPropMap = void 0;
  var numDynamicProps = 0;

  if (props) {
    componentPropMap = {};
    for (var prop in props) {
      if (isDynamic(t, props[prop])) {
        ++numDynamicProps;
        componentPropMap[prop] = { id: t.identifier((0, _genId2.default)(nextIdInt++)), value: props[prop] };
      } else {
        componentPropMap[prop] = { value: props[prop] };
      }
    }
  }
  return { numDynamicProps: numDynamicProps, componentPropMap: componentPropMap };
}

function instancePropsForComponent(t, _ref2) {
  var componentPropMap = _ref2.componentPropMap;

  return !componentPropMap ? EMPTY_ARRAY : Object.keys(componentPropMap).filter(function (prop) {
    return isDynamic(t, componentPropMap[prop].value);
  }).map(function (prop) {
    var _componentPropMap$pro2 = componentPropMap[prop];
    var id = _componentPropMap$pro2.id;
    var value = _componentPropMap$pro2.value;

    return objProp(t, id, value);
  });
}

function createInstanceObject(t, file, desc) {
  var lastDynamicUidInt = 0;

  // TODO: Split up genDynamicIdentifiers:
  //        - dynamicIdGenerator.generateForProp(prop)
  //        - dynamicIdGenerator.generateForDynamic(value, isOnlyChild)
  //        - dynamicIdGenerator.generateForComponent(componentName, componentProps)
  function genDynamicIdentifiers(value, prop, componentName, componentProps, contextId, isOnlyChild) {
    var isComponent = isComponentName(componentName);

    var _getComponentDescript = getComponentDescriptor(t, componentProps, lastDynamicUidInt);

    var componentPropMap = _getComponentDescript.componentPropMap;
    var numDynamicProps = _getComponentDescript.numDynamicProps;

    lastDynamicUidInt += numDynamicProps;

    var result = {
      isOnlyChild: isOnlyChild,
      prop: prop,
      value: value,
      isComponent: isComponent,
      componentName: componentName,
      componentPropMap: componentPropMap,
      hasDynamicComponentProps: !!numDynamicProps,
      valueId: !isComponent && t.identifier((0, _genId2.default)(lastDynamicUidInt++)),
      rerenderId: !prop && t.identifier((0, _genId2.default)(lastDynamicUidInt++)),
      contextId: contextId || t.identifier((0, _genId2.default)(lastDynamicUidInt++)),
      componentId: isComponent && t.identifier((0, _genId2.default)(lastDynamicUidInt++))
    };
    genDynamicIdentifiers.dynamics.push(result);
    return result;
  }
  genDynamicIdentifiers.dynamics = [];

  var specObject = createSpecObject(t, file, genDynamicIdentifiers, desc);
  var instancePropsForDynamics = genDynamicIdentifiers.dynamics.reduce(function (props, _ref3) {
    var isComponent = _ref3.isComponent;
    var value = _ref3.value;
    var valueId = _ref3.valueId;
    var componentId = _ref3.componentId;
    var componentPropMap = _ref3.componentPropMap;
    return [].concat(props, valueId ? [objProp(t, valueId, value)] : EMPTY_ARRAY, isComponent ? instancePropsForComponent(t, { componentPropMap: componentPropMap, componentId: componentId }) : EMPTY_ARRAY);
  }, []);

  var objectProps = [objProp(t, '$s', specObject)].concat(instancePropsForDynamics);

  if (desc.key) objectProps.push(objProp(t, 'key', desc.key));

  return t.objectExpression(objectProps);
}