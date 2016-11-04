"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
};
var message1 = "hello";

({
  $s: _xvdomSpec,
  b: message1
});
