const {
  DynamicProp,
  JSXHTMLElement
} = require('../parsing/JSXFragment.js');

const obj = require('./obj.js');
const memberExpr = require('./memberExpr.js');

const EMPTY_ARRAY = [];
const nonComponentPropDynamic = d => !(d instanceof DynamicProp) || d.el instanceof JSXHTMLElement;
const instParamId = t => t.identifier('inst');
const prevInstParamId = t => t.identifier('pInst');

//TODO: function generateSpecUpdateDynamicPropCode() {}
//TODO: function generateSpecUpdateDynamicChildCode() {}

function generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, getTmpVar, dynamic) {
  const { instanceContextId, instanceValueId, astNameId, isOnlyChild, hasSideEffects } = dynamic;
  if (dynamic instanceof DynamicProp) {
    const tmpVar = getTmpVar();
    return [t.expressionStatement(t.assignmentExpression('=', tmpVar, memberExpr(t, instId, instanceValueId))), t.ifStatement(t.binaryExpression('!==', tmpVar, memberExpr(t, pInstId, instanceValueId)), hasSideEffects ? t.blockStatement([t.ifStatement(t.binaryExpression('!==', memberExpr(t, pInstId, instanceContextId, astNameId), tmpVar), t.expressionStatement(t.assignmentExpression('=', memberExpr(t, pInstId, instanceContextId, astNameId), tmpVar))), t.expressionStatement(t.assignmentExpression('=', memberExpr(t, pInstId, instanceValueId), tmpVar))]) : t.expressionStatement(t.assignmentExpression('=', memberExpr(t, pInstId, instanceContextId, astNameId), t.assignmentExpression('=', memberExpr(t, pInstId, instanceValueId), tmpVar))))];
  } else {
    return [t.ifStatement(t.binaryExpression('!==', memberExpr(t, instId, instanceValueId), memberExpr(t, pInstId, instanceValueId)), t.expressionStatement(t.assignmentExpression('=', memberExpr(t, pInstId, instanceContextId), t.callExpression(xvdomApi.accessAPI('updateDynamic'), [t.booleanLiteral(isOnlyChild), memberExpr(t, pInstId, instanceValueId), t.assignmentExpression('=', memberExpr(t, pInstId, instanceValueId), memberExpr(t, instId, instanceValueId)), memberExpr(t, pInstId, instanceContextId)]))))];
  }
}

function generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component) {
  const dynamicProps = component.props.filter(p => p.dynamic);
  const condition = dynamicProps.map(p => t.binaryExpression('!==', memberExpr(t, instId, p.dynamic.instanceValueId), memberExpr(t, pInstId, p.dynamic.instanceValueId))).reduce((expra, exprb) => t.logicalExpression('||', expra, exprb));
  return t.ifStatement(condition, t.expressionStatement(t.assignmentExpression('=', memberExpr(t, pInstId, component.instanceContextId), t.callExpression(xvdomApi.accessAPI('updateComponent'), [t.identifier(component.tag), memberExpr(t, t.identifier(component.tag), t.identifier('state')), obj(t, component.props.reduce((hash, p) => {
    hash[p.astNameId.name] = !p.dynamic ? p.astValueNode : t.assignmentExpression('=', memberExpr(t, pInstId, p.dynamic.instanceValueId), memberExpr(t, instId, p.dynamic.instanceValueId));
    return hash;
  }, {})), memberExpr(t, pInstId, component.instanceContextId)]))));
}

function generateSpecUpdateCode(t, xvdomApi, { dynamics, customElementsWithDynamicProps }) {
  if (!dynamics.length) return t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY));

  const instId = instParamId(t);
  const pInstId = prevInstParamId(t);
  let tmpVar;
  const getTmpVar = () => tmpVar || (tmpVar = t.identifier('v'));

  const updateDynamicPropCode = dynamics.filter(nonComponentPropDynamic).reduce((acc, dynamic) => {
    acc.push(...generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, getTmpVar, dynamic));
    return acc;
  }, []);

  const updateDynamicComponents = [...customElementsWithDynamicProps].map(component => generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component));

  const tmpVarDecl = tmpVar ? [t.variableDeclaration('var', [t.variableDeclarator(tmpVar)])] : EMPTY_ARRAY;

  return t.functionExpression(null, [instId, pInstId], t.blockStatement([...tmpVarDecl, ...updateDynamicPropCode, ...updateDynamicComponents]));
}

module.exports = generateSpecUpdateCode;