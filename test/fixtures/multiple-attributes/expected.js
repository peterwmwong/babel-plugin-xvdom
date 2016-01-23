"use strict";

var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.b = _n;
    _n.className = inst.a;
    _n.id = inst.c;
    _n.title = inst.d;

    _n.appendChild(xvdom.createDynamic(true, _n, inst.e, inst, "f", "g"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.b.className = inst.a;
      pInst.a = inst.a;
    }

    if (inst.c !== pInst.c) {
      pInst.b.id = inst.c;
      pInst.c = inst.c;
    }

    if (inst.d !== pInst.d) {
      pInst.b.title = inst.d;
      pInst.d = inst.d;
    }

    if (inst.e !== pInst.e) {
      pInst.e = pInst.f(true, inst.e, pInst.e, pInst.g, pInst, "f", "g");
    }
  },
  r: null
};
var one = "1";
var two = "2";
var three = "3";
var four = "4";

({
  $s: _xvdomSpec,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: one,
  b: null,
  c: two,
  d: three,
  e: four,
  f: null,
  g: null
});
