"use strict";

var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div"),
        _n2;

    _n.appendChild(xvdom.createDynamic(false, _n, inst.a, inst, "b", "c"));

    _n2 = document.createElement("span");

    _n2.appendChild(xvdom.createDynamic(true, _n2, inst.d, inst, "e", "f"));

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(false, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }

    if (inst.d !== pInst.d) {
      pInst.d = pInst.e(true, inst.d, pInst.d, pInst.f, pInst, "e", "f");
    }
  },
  r: null
};
var message1 = "hello";
var message2 = "world";

({
  $s: _xvdomSpec,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: message1,
  b: null,
  c: null,
  d: message2,
  e: null,
  f: null
});
