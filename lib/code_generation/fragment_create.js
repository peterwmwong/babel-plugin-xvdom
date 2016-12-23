const {
  DynamicChild,
  JSXElement,
  JSXHTMLElement,
  JSXValueElement
} = require('../parsing/JSXFragment.js');

const {
  getPath
} = require('../pathing/index.js');

const FunctionGenerator = require('./function_generator.js');
const obj = require('./obj.js');
const memberExpr = require('./memberExpr.js');

const {
  log,
  logFunc,
  LOGGING
} = require('../logger.js');

const EMPTY_ARRAY = [];

function dynamicPropStatement(funcGen, domNodeExpression, jsxElementProp, expressionToAssignDomNode) {
  const { t } = funcGen;
  const { dynamic, astValueNode, astNameId } = jsxElementProp;
  const valueCode = dynamic ? memberExpr(t, funcGen.accessInstance(), dynamic.instanceValueId) : astValueNode;

  // Optimization: combine assigning to contextual node `inst.a` to the instance.
  if (expressionToAssignDomNode) {
    domNodeExpression = t.assignmentExpression('=', expressionToAssignDomNode, domNodeExpression);
  }

  const exprStmt = t.expressionStatement(t.assignmentExpression('=', memberExpr(t, domNodeExpression, astNameId), valueCode));

  return !dynamic.hasSideEffects ? exprStmt : t.ifStatement(t.binaryExpression('!=', valueCode, t.nullLiteral()), exprStmt);
}

function dynamicTextChildStatement(funcGen, jsxValueElement, parentNodeVarId) {
  const { t } = funcGen;
  const { dynamic: { instanceContextId, instanceValueId }, isOnlyChild, isFirstChild } = jsxValueElement;
  const instId = funcGen.accessInstance();
  const instContextExpr = memberExpr(t, instId, instanceContextId);
  const instValueExpr = memberExpr(t, instId, instanceValueId);
  return t.expressionStatement(isOnlyChild ? t.sequenceExpression([t.assignmentExpression('=', instContextExpr, parentNodeVarId), t.assignmentExpression('=', memberExpr(t, parentNodeVarId, 'innerText'), t.callExpression(funcGen.accessAPI('text'), [instValueExpr]))]) : t.callExpression(memberExpr(t, parentNodeVarId, 'appendChild'), [t.assignmentExpression('=', instContextExpr, t.callExpression(funcGen.accessAPI('createText'), [instValueExpr]))]));
}

function dynamicArrayOrJSXChildStatement(funcGen, jsxValueElement, parentNodeVarId) {
  const { t } = funcGen;
  const { dynamic: { instanceContextId, instanceValueId }, isOnlyChild } = jsxValueElement;
  const instId = funcGen.accessInstance();

  return t.expressionStatement(t.assignmentExpression('=', memberExpr(t, instId, instanceContextId), t.callExpression(funcGen.accessAPI(`createDynamic${ isOnlyChild ? 'OnlyChild' : '' }`), [parentNodeVarId, memberExpr(t, instId, instanceValueId)])));
}

function dynamicChildStatement(funcGen, jsxValueElement, parentNodeVarId) {
  return (jsxValueElement.isText ? dynamicTextChildStatement : dynamicArrayOrJSXChildStatement)(funcGen, jsxValueElement, parentNodeVarId);
}

function staticChildStatment(funcGen, jsxValueElement, parentNodeVarId) {
  const { t } = funcGen;
  const { astValueNode, isOnlyChild } = jsxValueElement;

  return t.expressionStatement(
  // Optimization: https://jsperf.com/textcontent-vs-createtextnode-vs-innertext
  isOnlyChild ? // _n.textContent = "hello" + 5;
  t.assignmentExpression('=', memberExpr(t, parentNodeVarId, 'textContent'), astValueNode) : // _n.appendChild(document.createTextNode(("hello" + 5) || ""));
  t.callExpression(memberExpr(t, parentNodeVarId, 'appendChild'), [t.callExpression(memberExpr(t, 'document', 'createTextNode'), [astValueNode])]));
}

function componentCode(funcGen, jsxElement, depth) {
  const { t } = funcGen;
  const { instanceContextId, numDynamicProps, props, tag } = jsxElement;
  const componentId = t.identifier(tag);
  const propsArg = !props.length ? t.nullLiteral() : obj(t, props.reduce((acc, { astNameId, astValueNode, dynamic }) => (acc[astNameId.name] = dynamic ? memberExpr(t, funcGen.accessInstance(), dynamic.instanceValueId) : astValueNode, acc), {}));

  // Create element
  // ex. _xvdomCreateComponent('div');
  let createComponentCode = t.callExpression(funcGen.accessAPI('createComponent'), [componentId, memberExpr(t, componentId, 'state'), propsArg, funcGen.accessInstance()]);

  if (numDynamicProps) {
    createComponentCode = t.assignmentExpression('=', memberExpr(t, funcGen.accessInstance(), instanceContextId), createComponentCode);
  }

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  funcGen.defineOrSetTmpVar(depth, memberExpr(t, createComponentCode, '$n'));

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if (depth) {
    funcGen.addStatement(t.expressionStatement(t.callExpression(memberExpr(t, funcGen.getTmpVarId(depth - 1), 'appendChild'), [funcGen.getTmpVarId(depth)])));
  }
}

function htmlElementCode(funcGen, jsxHTMLElement, depth, shouldGenerateDynamicPropCode) {
  const { t } = funcGen;
  // Create element
  // ex. _xvdomEl('div');
  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  funcGen.defineOrSetTmpVar(depth, t.callExpression(funcGen.accessAPI('el'), [t.stringLiteral(jsxHTMLElement.tag)]));

  // Assign props
  const nodeVarId = funcGen.getTmpVarId(depth);
  let i = 0;
  for (let prop of jsxHTMLElement.props) {
    if (shouldGenerateDynamicPropCode || !prop.dynamic) {
      // Optimization: Only assign the instanceContextId once
      funcGen.addStatement(dynamicPropStatement(funcGen, nodeVarId, prop, i === 0 && prop.dynamic && memberExpr(t, funcGen.accessInstance(), prop.dynamic.instanceContextId)));
    }
    i++;
  };

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if (depth) {
    funcGen.addStatement(t.expressionStatement(t.callExpression(memberExpr(t, funcGen.getTmpVarId(depth - 1), 'appendChild'), [nodeVarId])));
  }

  ++depth;

  for (let jsxElementChild of jsxHTMLElement.children) {
    if (jsxElementChild instanceof JSXHTMLElement) {
      htmlElementCode(funcGen, jsxElementChild, depth, shouldGenerateDynamicPropCode);
    } else if (jsxElementChild instanceof JSXElement) {
      componentCode(funcGen, jsxElementChild, depth);
    } else if (jsxElementChild instanceof JSXValueElement) {
      funcGen.addStatement(jsxElementChild.dynamic ? dynamicChildStatement(funcGen, jsxElementChild, nodeVarId) : staticChildStatment(funcGen, jsxElementChild, nodeVarId));
    }
  }
}

const distanceFromEnds = ({ index, distFromEnd }) => Math.min(index, distFromEnd);
const sortDistanceFromEnds = (a, b) => distanceFromEnds(a.el) - distanceFromEnds(b.el);

const sortDynamicsByDepthThenDistanceFromEnds = dynamics => dynamics.reduce((depthGroups, d) => {
  const depth = d.el.depth;
  (depthGroups[depth] || (depthGroups[depth] = [])).push(d);
  return depthGroups;
}, []).reduce((result, group) => [...result, ...group.sort(sortDistanceFromEnds)], []);

const expressionForPath = (path, funcGen, elToTmpVarId) => logFunc('dynamicsPath', `expressionForPath ${ path.toString() }`, () => {
  const { t } = funcGen;
  const { el, parent } = path;

  if (elToTmpVarId.has(el)) {
    log('dynamicsPath', 'using saved variable', funcGen.getTmpVarId(elToTmpVarId.get(el)).name);
    return funcGen.getTmpVarId(elToTmpVarId.get(el));
  } else if (!parent) {
    return funcGen.getTmpVarId(elToTmpVarId.set(el, elToTmpVarId.size).get(el));
  } else {
    const memberExpression = memberExpr(t, expressionForPath(parent, funcGen, elToTmpVarId), el.relationshipTo(parent.el));

    if (path.shouldBeSaved) {
      log('dynamicsPath', '> saving', el.tag);
      return t.assignmentExpression('=', funcGen.getTmpVarId(elToTmpVarId.set(el, elToTmpVarId.size).get(el)), memberExpression);
    }
    return memberExpression;
  }
});

function cloneableDynamicPropCode(funcGen, dynamic, elToTmpVarId) {
  const { t } = funcGen;
  const originalSavedEls = new Set(elToTmpVarId.keys());

  return dynamicPropStatement(funcGen, expressionForPath(dynamic.el.finalizedPath, funcGen, elToTmpVarId), dynamic.prop, !originalSavedEls.has(dynamic.el) && dynamic.prop.dynamic && memberExpr(t, funcGen.accessInstance(), dynamic.instanceContextId));
}

function cloneableDynamicsCode(funcGen, rootEl, dynamics) {
  const { t } = funcGen;
  const elToTmpVarId = new Map();
  const sortedDynamics = sortDynamicsByDepthThenDistanceFromEnds(dynamics);

  // Calculate shortest paths
  for (let d of sortedDynamics) {
    getPath(d.el, undefined, true).finalize(d);
  }

  for (let d of sortedDynamics) {
    // TODO: Handle dynamic children
    if (d instanceof DynamicChild) return;
    if (LOGGING.dynamicsPath) log('dynamicsPath', d.el.finalizedPath.toString());

    // Generate member expression for path
    funcGen.addStatement(cloneableDynamicPropCode(funcGen, d, elToTmpVarId));
  }

  elToTmpVarId.delete(rootEl);
  for (let [el, tmpVarId] of elToTmpVarId.entries()) {
    funcGen.defineOrSetTmpVar(tmpVarId);
  }
}

function cloneableElementCode(funcGen, jsxFragment) {
  const { rootElement, isCloneable, dynamics } = jsxFragment;
  const { t } = funcGen;
  const specNodeId = funcGen.definePrefixedGlobal('xvdomSpecNode', t.nullLiteral());
  const createSpecFuncGen = new FunctionGenerator(t, funcGen.fileGlobals);

  // function _xvdomSpecNodeCreate() {
  //   ...
  // }
  elementCode(createSpecFuncGen, rootElement, false);

  const createSpecNodeId = funcGen.definePrefixedGlobal('xvdomSpecNodeCreate', createSpecFuncGen.code);

  // var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true);
  funcGen.defineOrSetTmpVar(0, t.callExpression(memberExpr(t, t.logicalExpression('||', specNodeId, t.assignmentExpression('=', specNodeId, t.callExpression(createSpecNodeId, EMPTY_ARRAY))), 'cloneNode'), [t.booleanLiteral(true)]));

  cloneableDynamicsCode(funcGen, rootElement, dynamics);
}

function elementCode(funcGen, el, shouldGenerateDynamicPropCode) {
  if (el instanceof JSXHTMLElement) htmlElementCode(funcGen, el, 0, shouldGenerateDynamicPropCode);else componentCode(funcGen, el, 0);
}

module.exports = function (t, fileGlobals, jsxFragment) {
  const { rootElement, dynamics, hasComponents, isCloneable } = jsxFragment;
  const funcGen = new FunctionGenerator(t, fileGlobals);

  if (isCloneable) cloneableElementCode(funcGen, jsxFragment);else elementCode(funcGen, rootElement, true);

  return funcGen.code;
};