// Helper to transform a JSX identifier into a normal reference.
module.exports = function (t, node, identifier) {
  if (t.isIdentifier(node)) {
    return node;
  } else if (t.isJSXIdentifier(node)) {
    return identifier ? t.identifier(node.name) : t.stringLiteral(node.name);
  } else {
    return node;
  }
};