"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n;
    _n.className = inst.b;
    _n.id = inst.c;
    _n.title = inst.d;

    _n.appendChild(inst.e = _xvdomCreateDynamic(true, _n, inst.f));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
    v = inst.c;
    if (v !== pInst.c) pInst.a.id = pInst.c = v;
    v = inst.d;
    if (v !== pInst.d) pInst.a.title = pInst.d = v;
    if (inst.f !== pInst.f) pInst.e = _xvdomUpdateDynamic(true, pInst.f, pInst.f = inst.f, pInst.e);
  },
  r: xvdom.DEADPOOL
};
var one = "1";
var two = "2";
var three = "3";
var four = "4";

({
  $s: _xvdomSpec,
  b: one,
  c: two,
  d: three,
  f: four
});
