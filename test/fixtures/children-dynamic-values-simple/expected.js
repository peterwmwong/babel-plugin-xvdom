"use strict";

var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamicOnlyChild(_n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: null
};
var message1 = "hello";

({
  $s: _xvdomSpec,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: message1,
  b: null,
  c: null
});
