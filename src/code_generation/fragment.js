const fragmentCreateCode = require('./fragment_create.js');
const fragmentUpdateCode = require('./fragment_update.js');
const obj = require('./obj.js');
const memberExpr = require('./memberExpr.js');

module.exports = (t, fileGlobals, frag) => (
  obj(t, {
    c: fragmentCreateCode(t, fileGlobals, frag),
    u: fragmentUpdateCode(t, fileGlobals, frag),
    r: memberExpr(t, 'xvdom', 'DEADPOOL')
  })
);