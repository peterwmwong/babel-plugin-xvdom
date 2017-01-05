const idify = require('./idify.js');

module.exports = (t, key, value, ...args) => (
  t.isFunctionExpression(value)
    ? t.objectMethod('method', idify(t, key), value.params, value.body, ...args)
    : t.objectProperty(idify(t, key), value, ...args)
)