"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span");

    _n.appendChild(inst.a = _xvdomCreateDynamic(false, _n, inst.b));

    _n.appendChild(_n2);

    _n2.appendChild(inst.c = _xvdomCreateDynamic(true, _n2, inst.d));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(false, pInst.b, pInst.b = inst.b, pInst.a);
    if (inst.d !== pInst.d) pInst.c = _xvdomUpdateDynamic(true, pInst.d, pInst.d = inst.d, pInst.c);
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec3 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec4 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec5 = {
  c: function c(inst) {
    var _n = _xvdomEl("div");

    _n.appendChild(inst.a = _xvdomCreateDynamic(true, _n, inst.b));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(true, pInst.b, pInst.b = inst.b, pInst.a);
  },
  r: xvdom.DEADPOOL
},
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var message1 = "hello";
var message2 = "world";
function translate(str) {
  return str;
}

({
  $s: _xvdomSpec,
  b: message1,
  d: message2
});

({
  $s: _xvdomSpec2,
  b: message2[0]
});
({
  $s: _xvdomSpec3,
  b: message2 + "hello"
});
({
  $s: _xvdomSpec4,
  b: translate(message2)
});
({
  $s: _xvdomSpec5,
  b: message2.length
});
