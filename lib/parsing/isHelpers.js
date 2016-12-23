const isAttr = (attr, name) => attr.name.name === name;
const isCloneableAttribute = attr => isAttr(attr, 'cloneable');
const isKeyAttribute = attr => isAttr(attr, 'key');
const isRecycleAttribute = attr => isAttr(attr, 'recycle');
const isNotXvdomAttribute = attr => !(isCloneableAttribute(attr) || isKeyAttribute(attr) || isRecycleAttribute(attr));
const isComponentName = name => /^[A-Z]/.test(name);

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

module.exports = {
  isCloneableAttribute,
  isComponentName,
  isDynamicNode,
  isKeyAttribute,
  isNotXvdomAttribute,
  isRecycleAttribute
};