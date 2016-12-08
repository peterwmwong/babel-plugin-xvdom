"use strict";

var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    (inst.a = _n).className = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    (inst.a = _n).className = inst.b;
    _n.title = inst.c;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
    v = inst.c;
    if (v !== pInst.c) pInst.a.title = pInst.c = v;
  },
  r: xvdom.DEADPOOL
};
var msg = "hello";
function translate(str) {
  return str;
}

({
  $s: _xvdomSpec,
  b: msg
});
({
  $s: _xvdomSpec2,
  b: msg + "hello",
  c: translate(msg)
});
