"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec7 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec6 = {
  c: function c() {
    var _n = _xvdomEl("div");

    _n.appendChild(document.createTextNode(("hello" + 5) || ""));

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec5 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec4 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n;
    _n.className = inst.b;
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
({
  $s: _xvdomSpec3,
  b: msg
});
({
  $s: _xvdomSpec4,
  b: msg + "hello"
});
({
  $s: _xvdomSpec5,
  b: translate(msg)
});
({
  $s: _xvdomSpec6
});
({
  $s: _xvdomSpec7,
  b: msg.length
});
