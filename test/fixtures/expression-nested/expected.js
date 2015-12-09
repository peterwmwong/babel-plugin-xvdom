"use strict";

var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.id = inst.b;

    _n.appendChild(xvdom.createDynamic(inst.g, inst, "h", "i"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.id = inst.b;
      pInst.b = inst.b;
    }

    if (inst.g !== pInst.g) {
      pInst.g = pInst.h(inst.g, pInst.g, pInst.i, pInst, "h", "i");
    }
  }
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("span");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
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
  b: id,
  c: null,
  d: null,
  g: list.map(function (el) {
    return {
      $s: _xvdomSpec,
      $n: null,
      $c: null,
      $t: null,
      $a: null,
      $p: null,
      b: el,
      c: null,
      d: null
    };
  }),
  h: null,
  i: null
});
