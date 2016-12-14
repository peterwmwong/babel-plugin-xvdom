module.exports = (t, keyValues) => (
  t.objectExpression(
    Object.entries(keyValues).map(([key, value]) => (
      t.isFunctionExpression(value)
        ? t.objectMethod('method', t.identifier(key), value.params, value.body)
        : t.objectProperty(t.identifier(key), value)
    ))
  )
);
