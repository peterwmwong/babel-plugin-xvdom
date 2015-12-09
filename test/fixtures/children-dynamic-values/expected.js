"use strict";

var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div"),
        _n2;

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    _n2 = document.createElement("span");

    _n2.appendChild(xvdom.createDynamic(inst.g, inst, "h", "i"));

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }

    if (inst.g !== pInst.g) {
      pInst.g = pInst.h(inst.g, pInst.g, pInst.i, pInst, "h", "i");
    }
  }
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
  b: message1,
  c: null,
  d: null,
  g: message2,
  h: null,
  i: null
});
