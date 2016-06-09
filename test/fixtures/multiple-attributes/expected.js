"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic;
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.b = _n;
    _n.className = inst.a;
    _n.id = inst.c;
    _n.title = inst.d;

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.e, inst, "f", "g"));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.b.id = v;
      pInst.c = v;
    }

    v = inst.d;

    if (v !== pInst.d) {
      pInst.b.title = v;
      pInst.d = v;
    }

    if (inst.e !== pInst.e) {
      pInst.e = pInst.f(true, inst.e, pInst.e, pInst.g, pInst, "f", "g");
    }
  },
  r: xvdom.DEADPOOL
};
var one = "1";
var two = "2";
var three = "3";
var four = "4";

({
  $s: _xvdomSpec,
  a: one,
  c: two,
  d: three,
  e: four
});
