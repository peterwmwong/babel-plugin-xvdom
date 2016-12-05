"use strict";

var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c: function c(inst) {
    var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true),
        _n2,
        _n3,
        _n4,
        _n5,
        _n6,
        _n7;

    _n2 = _n.lastChild;

    inst.a = _n2;
    _n2.id = inst.b;

    _n3 = _n2.previousSibling.firstChild;
    _n4 = _n3.nextSibling;
    inst.c = _n4;
    _n4.id = inst.d;

    _n5 = _n3.firstChild;
    inst.e = _n5;
    _n5.id = inst.f;

    _n6 = _n5.nextSibling;
    inst.g = _n6;
    _n6.id = inst.h;

    _n7 = _n4.nextSibling.firstChild;
    inst.i = _n7;
    _n7.id = inst.j;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.id = pInst.b = v;

    v = inst.d;
    if (v !== pInst.d) pInst.c.id = pInst.d = v;

    v = inst.f;
    if (v !== pInst.f) pInst.e.id = pInst.f = v;

    v = inst.j;
    if (v !== pInst.j) pInst.i.id = pInst.j = v;
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpecNode = null,
    _xvdomSpecNodeCreate = function _xvdomSpecNodeCreate() {
  var _n = _xvdomEl("a"),
      _n2 = _xvdomEl("b"),
      _n3 = _xvdomEl("e"),
      _n4 = _xvdomEl("i");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("d");
  _n.appendChild(_n2)

  _n2.appendChild(_n3);

  _n3.appendChild(_n4);

  _n4 = _xvdomEl("j");
  _n3.appendChild(_n4);

  _n3 = _xvdomEl("f");
  _n2.appendChild(_n3);

  _n3 = _xvdomEl("g");
  _n2.appendChild(_n3);

  _n4 = _xvdomEl("h");
  _n3.appendChild(_n4);

  _n2 = _xvdomEl("c");
  _n.appendChild(_n2);

  return _n;
},

var var1 = 1;

({
  $s: _xvdomSpec,
  b: var1
});
