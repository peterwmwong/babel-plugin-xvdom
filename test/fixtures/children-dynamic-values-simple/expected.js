"use strict";

var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var message1 = "hello";

({
  $s: _xvdomSpec,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: message1,
  c: null,
  d: null
});
