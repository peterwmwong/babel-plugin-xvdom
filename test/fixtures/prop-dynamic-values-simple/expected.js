"use strict";

var _xvdomEl = xvdom.el;
var _xvdomSpec4 = {
  c: function c(inst) {
    var _n = _xvdomEl("a");

    inst.a = _n;
    if (inst.b != null) _n.href = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;

    if (v !== pInst.b) {
      if (pInst.a.href !== v) pInst.a.href = v;
      pInst.b = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = _xvdomEl("input");

    inst.a = _n;
    if (inst.b != null) _n.value = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;

    if (v !== pInst.b) {
      if (pInst.a.value !== v) pInst.a.value = v;
      pInst.b = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("input");

    inst.a = _n;
    _n.disabled = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.disabled = pInst.b = v;
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n;
    _n.className = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
  },
  r: xvdom.DEADPOOL
};
var messageType = "unread";

({
  $s: _xvdomSpec,
  b: messageType
});
({
  $s: _xvdomSpec2,
  b: !messageType
});
({
  $s: _xvdomSpec3,
  b: messageType
});
({
  $s: _xvdomSpec4,
  b: messageType
});
