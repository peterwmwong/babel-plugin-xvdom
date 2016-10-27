"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    inst.b = _n;
    _n.id = inst.a;
    inst.d = _xvdomCreateDynamic(true, _n, inst.c);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.id = v;
      pInst.a = v;
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic(true, pInst.c, pInst.c = inst.c, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("span");

    inst.b = _xvdomCreateDynamic(true, _n, inst.a);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic(true, pInst.a, pInst.a = inst.a, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var list = [1, 2, 3];
var id = "blah";

({
  $s: _xvdomSpec2,
  a: id,
  c: list.map(function (el) {
    return {
      $s: _xvdomSpec,
      a: el
    };
  })
});
