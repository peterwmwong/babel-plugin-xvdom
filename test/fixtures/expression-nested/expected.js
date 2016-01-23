"use strict";

var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.b = _n;
    _n.id = inst.a;

    _n.appendChild(xvdom.createDynamic(true, _n, inst.c, inst, "d", "e"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.b.id = inst.a;
      pInst.a = inst.a;
    }

    if (inst.c !== pInst.c) {
      pInst.c = pInst.d(true, inst.c, pInst.c, pInst.e, pInst, "d", "e");
    }
  },
  r: null
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("span");

    _n.appendChild(xvdom.createDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: null
};
var list = [1, 2, 3];
var id = "blah";

({
  $s: _xvdomSpec2,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: id,
  b: null,
  c: list.map(function (el) {
    return {
      $s: _xvdomSpec,
      $n: null,
      $c: null,
      $t: null,
      $a: null,
      $p: null,
      a: el,
      b: null,
      c: null
    };
  }),
  d: null,
  e: null
});
