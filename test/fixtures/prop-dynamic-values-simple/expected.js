"use strict";

var _xvdomEl = xvdom.el;
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = _xvdomEl("input");

    inst.b = _n;
    _n.value = inst.a;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      if (pInst.b.value !== v) {
        pInst.b.value = v;
      }

      pInst.a = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("input");

    inst.b = _n;
    _n.disabled = inst.a;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.disabled = v;
      pInst.a = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    inst.b = _n;
    _n.className = inst.a;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }
  },
  r: xvdom.DEADPOOL
};
var messageType = "unread";

({
  $s: _xvdomSpec,
  a: messageType
});
({
  $s: _xvdomSpec2,
  a: !messageType
});
({
  $s: _xvdomSpec3,
  a: messageType
});
