const objProp = require('./obj_prop.js');

module.exports = (t, { dynamics, key }, fragId) => t.objectExpression([objProp(t, 's', fragId), ...(key ? [objProp(t, 'key', key)] : []), ...(!dynamics.length ? [] : [objProp(t, 'v', t.objectExpression(dynamics.map(({ instanceValueId, astValueNode }) => objProp(t, instanceValueId, astValueNode))))])]);