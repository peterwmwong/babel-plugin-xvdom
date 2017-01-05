const {
  DynamicChild,
  DynamicProp,
  JSXHTMLElement
} = require('../parsing/JSXFragment.js');

const obj = require('./obj.js');
const memberExpr = require('./memberExpr.js');

const EMPTY_ARRAY = [];
const nonComponentPropDynamic = d => d instanceof DynamicProp && d.el instanceof JSXHTMLElement || d instanceof DynamicChild;
const instParamId = t => t.identifier('v');
const prevInstParamId = t => t.identifier('pv');
const ctxId = t => t.identifier('c');

function dynamicPropStatement(t, xvdomApi, instId, pInstId, getTmpVar, dynamicProp) {
  const { instanceContextId, instanceValueId, astNameId, hasSideEffects } = dynamicProp;
  const valueExpr = memberExpr(t, instId, instanceValueId);
  return t.ifStatement(t.binaryExpression('!==', valueExpr, memberExpr(t, pInstId, instanceValueId)), hasSideEffects ? t.blockStatement([t.ifStatement(t.binaryExpression('!==', memberExpr(t, ctxId(t), instanceContextId, astNameId), valueExpr), t.expressionStatement(t.assignmentExpression('=', memberExpr(t, ctxId(t), instanceContextId, astNameId), valueExpr))), t.expressionStatement(t.assignmentExpression('=', memberExpr(t, pInstId, instanceValueId), valueExpr))]) : t.expressionStatement(t.assignmentExpression('=', memberExpr(t, ctxId(t), instanceContextId, astNameId), valueExpr)));
}

function dynamicArrayOrJSXChildStatement(t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild) {
  const { instanceContextId, instanceValueId, isOnlyChild } = dynamicChild;
  return t.expressionStatement(t.assignmentExpression('=', memberExpr(t, ctxId(t), instanceContextId), t.callExpression(xvdomApi.accessAPI(`updateDynamic${ isOnlyChild ? 'OnlyChild' : '' }`), [memberExpr(t, pInstId, instanceValueId), t.assignmentExpression('=', memberExpr(t, pInstId, instanceValueId), memberExpr(t, instId, instanceValueId)), memberExpr(t, ctxId(t), instanceContextId)])));
}

function dynamicTextChildStatements(t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild) {
  const { instanceContextId, instanceValueId, isOnlyChild } = dynamicChild;
  return t.expressionStatement(t.assignmentExpression('=', isOnlyChild ? memberExpr(t, ctxId(t), instanceContextId, 'innerText') : memberExpr(t, ctxId(t), instanceContextId, 'data'), t.callExpression(xvdomApi.accessAPI(`text`), [t.assignmentExpression('=', memberExpr(t, pInstId, instanceValueId), memberExpr(t, instId, instanceValueId))])));
}

function dynamicChildStatement(t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild) {
  const { instanceValueId, isText } = dynamicChild;
  return t.ifStatement(t.binaryExpression('!==', memberExpr(t, instId, instanceValueId), memberExpr(t, pInstId, instanceValueId)), (isText ? dynamicTextChildStatements : dynamicArrayOrJSXChildStatement)(t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild));
}

function componentDynamicStatement(t, xvdomApi, instId, pInstId, component) {
  const dynamicProps = component.props.filter(p => p.dynamic);
  const condition = dynamicProps.map(p => t.binaryExpression('!==', memberExpr(t, instId, p.dynamic.instanceValueId), memberExpr(t, pInstId, p.dynamic.instanceValueId))).reduce((expra, exprb) => t.logicalExpression('||', expra, exprb));
  return t.ifStatement(condition, t.expressionStatement(t.assignmentExpression('=', memberExpr(t, ctxId(t), component.instanceContextId), t.callExpression(xvdomApi.accessAPI('updateComponent'), [t.identifier(component.tag), memberExpr(t, component.tag, 'state'), obj(t, component.props.reduce((hash, p) => {
    hash[p.astNameId.name] = !p.dynamic ? p.astValueNode : t.assignmentExpression('=', memberExpr(t, pInstId, p.dynamic.instanceValueId), memberExpr(t, instId, p.dynamic.instanceValueId));
    return hash;
  }, {})), memberExpr(t, ctxId(t), component.instanceContextId)]))));
}

module.exports = function fragmentUpdateCode(t, xvdomApi, { dynamics, customElementsWithDynamicProps }, valuesHeadId) {
  if (!dynamics.length) return t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY));

  const instId = instParamId(t);
  const pInstId = prevInstParamId(t);
  let tmpVar;
  const getTmpVar = () => tmpVar || (tmpVar = t.identifier('v'));

  const updateDynamicPropCode = dynamics.filter(nonComponentPropDynamic).reduce((acc, dynamic) => [...acc, dynamic instanceof DynamicProp ? dynamicPropStatement(t, xvdomApi, instId, pInstId, getTmpVar, dynamic) : dynamicChildStatement(t, xvdomApi, instId, pInstId, getTmpVar, dynamic)], []);

  const updateDynamicComponents = [...customElementsWithDynamicProps].map(component => componentDynamicStatement(t, xvdomApi, instId, pInstId, component));

  // pv.z = _xvdomSpecValuesHead;
  // _xvdomSpecValuesHead = pv.z;
  const valuePushStatements = [t.assignmentExpression('=', memberExpr(t, pInstId, 'z'), valuesHeadId), t.assignmentExpression('=', valuesHeadId, memberExpr(t, pInstId))].map(e => t.expressionStatement(e));

  const tmpVarDecl = tmpVar ? [t.variableDeclaration('var', [t.variableDeclarator(tmpVar)])] : EMPTY_ARRAY;

  return t.functionExpression(null, [instId, pInstId, ctxId(t)], t.blockStatement([...tmpVarDecl, ...updateDynamicPropCode, ...updateDynamicComponents, ...valuePushStatements]));
};