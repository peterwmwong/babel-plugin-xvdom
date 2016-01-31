"use strict";

var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = document.createElement("input");

    inst.b = _n;
    _n.disabled = inst.a;
    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.b.disabled = inst.a;
      pInst.a = inst.a;
    }
  },
  r: xvdom.DeadPool
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.b = _n;
    _n.className = inst.a;
    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.b.className = inst.a;
      pInst.a = inst.a;
    }
  },
  r: xvdom.DeadPool
};
var messageType = "unread";

({
  $s: _xvdomSpec,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: messageType,
  b: null
});
({
  $s: _xvdomSpec2,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: !messageType,
  b: null
});
