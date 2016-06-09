"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic;
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.b = _n;
    _n.id = inst.a;

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.c, inst, "d", "e"));

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
      pInst.c = pInst.d(true, inst.c, pInst.c, pInst.e, pInst, "d", "e");
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("span");

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
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
