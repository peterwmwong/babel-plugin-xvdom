const toReference = require('./toReference.js');

module.exports = function normalizeElementPropValue(t, astNode) {
  return t.isJSXExpressionContainer(astNode) ? normalizeElementPropValue(t, astNode.expression) : t.isJSXEmptyExpression(astNode) ? null : t.isIdentifier(astNode) || t.isMemberExpression(astNode) ? toReference(t, astNode) : astNode == null ? t.booleanLiteral(true) : astNode;
};