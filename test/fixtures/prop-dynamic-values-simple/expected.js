"use strict";

var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = document.createElement("input");

    inst.d = _n;
    _n.disabled = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.disabled = inst.b;
      pInst.b = inst.b;
    }
  }
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.className = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.className = inst.b;
      pInst.b = inst.b;
    }
  }
};
var messageType = "unread";

({
  $s: _xvdomSpec,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: messageType,
  c: null,
  d: null
});
({
  $s: _xvdomSpec2,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: !messageType,
  c: null,
  d: null
});
