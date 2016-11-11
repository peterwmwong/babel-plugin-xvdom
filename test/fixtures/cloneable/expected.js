"use strict";

var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c: function c(inst) {
    var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true);

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
},
    _xvdomSpec2 = {
  c: function c(inst) {
    var _n = (_xvdomSpecNode2 || (_xvdomSpecNode2 = _xvdomSpecNodeCreate2())).cloneNode(true);

    inst.a = _n.firstChild;
    _n.firstChild.className = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec3 = {
  c: function c(inst) {
    var _n = (_xvdomSpecNode3 || (_xvdomSpecNode3 = _xvdomSpecNodeCreate3())).cloneNode(true);

    inst.a = _n.lastChild.previousSibling;
    _n.lastChild.previousSibling.className = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec4 = {
  c: function c(inst) {
    var _n = (_xvdomSpecNode4 || (_xvdomSpecNode4 = _xvdomSpecNodeCreate4())).cloneNode(true);

    inst.a = _n.lastChild;
    _n.lastChild.className = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec5 = {
  c: function c(inst) {
    var _n = (_xvdomSpecNode5 || (_xvdomSpecNode5 = _xvdomSpecNodeCreate5())).cloneNode(true);

    inst.a = _n.lastChild.previousSibling;
    _n.lastChild.previousSibling.className = inst.b;
    inst.c = _n.lastChild;
    _n.lastChild.className = inst.d;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
    v = inst.d;
    if (v !== pInst.d) pInst.c.className = pInst.d = v;
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpecNode = null,
    _xvdomSpecNode2 = null,
    _xvdomSpecNode3 = null,
    _xvdomSpecNode4 = null,
    _xvdomSpecNode5 = null,
    _xvdomSpecNodeCreate = function _xvdomSpecNodeCreate() {
  var _n = _xvdomEl("div");

  return _n;
},
    _xvdomSpecNodeCreate2 = function _xvdomSpecNodeCreate2() {
  var _n = _xvdomEl("div"),
      _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  return _n;
},
    _xvdomSpecNodeCreate3 = function _xvdomSpecNodeCreate3() {
  var _n = _xvdomEl("div"),
      _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  return _n;
},
    _xvdomSpecNodeCreate4 = function _xvdomSpecNodeCreate4() {
  var _n = _xvdomEl("div"),
      _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  return _n;
},
    _xvdomSpecNodeCreate5 = function _xvdomSpecNodeCreate5() {
  var _n = _xvdomEl("div"),
      _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  return _n;
};

var var1 = 1;
var var2 = 2;

({
  $s: _xvdomSpec,
  b: var1
});

({
  $s: _xvdomSpec2,
  b: var1
});

({
  $s: _xvdomSpec3,
  b: var1
});

({
  $s: _xvdomSpec4,
  b: var1
});

({
  $s: _xvdomSpec5,
  b: var1,
  d: var2
});
