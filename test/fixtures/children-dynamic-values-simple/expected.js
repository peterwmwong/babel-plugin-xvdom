"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic;
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: xvdom.DEADPOOL
};
var message1 = "hello";

({
  $s: _xvdomSpec,
  a: message1
});
