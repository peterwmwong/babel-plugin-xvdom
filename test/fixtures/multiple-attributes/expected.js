"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    inst.b = _n;
    _n.className = inst.a;
    _n.id = inst.c;
    _n.title = inst.d;

    _n.appendChild(inst.f = _xvdomCreateDynamic(true, _n, inst.e));

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
      pInst.f = _xvdomUpdateDynamic(true, pInst.e, pInst.e = inst.e, pInst.f);
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
