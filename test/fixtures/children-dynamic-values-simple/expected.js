"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(inst.b = _xvdomCreateDynamic(true, _n, inst.a));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic(true, pInst.a, pInst.a = inst.a, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var message1 = "hello";

({
  $s: _xvdomSpec,
  a: message1
});
