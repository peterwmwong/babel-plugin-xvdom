const objProp = require('./obj_prop.js');

module.exports = (t, keyValues) => (
  t.objectExpression(
    Object.entries(keyValues)
      .map(([key, value]) => objProp(t, key, value))
  )
);
