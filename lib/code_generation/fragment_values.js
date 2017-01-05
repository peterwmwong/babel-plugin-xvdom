const objProp = require('./obj_prop.js');
const memberExpr = require('./memberExpr.js');

const NEXT_PROP_NAME = 'z';

module.exports = function (t, valuesHeadId, dynamics) {
  const valueNames = dynamics.map(d => d.instanceValueId.name);
  const resultId = t.identifier('r');
  return t.functionExpression(null, valueNames.sort().map(n => t.identifier(n)), t.blockStatement([t.ifStatement(t.binaryExpression('===', valuesHeadId, t.nullLiteral()), t.returnStatement(t.objectExpression([...dynamics.map(d => objProp(t, d.instanceValueId, d.instanceValueId, false, true)), objProp(t, NEXT_PROP_NAME, t.nullLiteral())]))), t.variableDeclaration('var', [t.variableDeclarator(t.identifier('r'), valuesHeadId)]), ...[t.assignmentExpression('=', valuesHeadId, memberExpr(t, resultId, NEXT_PROP_NAME)), ...dynamics.map(d => t.assignmentExpression('=', memberExpr(t, resultId, d.instanceValueId), d.instanceValueId))].map(expr => t.expressionStatement(expr)), t.returnStatement(resultId)]));
};