const idify = require('./idify.js');

module.exports = (t, key, value) => t.isFunctionExpression(value) ? t.objectMethod('method', idify(t, key), value.params, value.body) : t.objectProperty(idify(t, key), value);