"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n;
    _n.id = inst.b;

    _n.appendChild(inst.c = _xvdomCreateDynamic(true, _n, inst.d));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.id = pInst.b = v;
    if (inst.d !== pInst.d) pInst.c = _xvdomUpdateDynamic(true, pInst.d, pInst.d = inst.d, pInst.c);
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("span");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
};
var list = [1, 2, 3];
var id = "blah";

({
  $s: _xvdomSpec2,
  b: id,
  d: list.map(function (el) {
    return {
      $s: _xvdomSpec,
      b: el
    };
  })
});
