var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true),
        _n2,
        _n3,
        _n4,
        _n5;

    (inst.i = _n2 = _n.lastChild).id = inst.j;
    (inst.e = _n4 = (_n3 = _n2.previousSibling.firstChild).nextSibling).id = inst.f;
    (inst.g = _n4.nextSibling.firstChild).id = inst.h;
    (inst.a = (_n5 = _n3.firstChild).firstChild.firstChild).id = inst.b;
    (inst.c = _n5.lastChild.firstChild).id = inst.d;
    return _n;
  },

  u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.id = pInst.b = v;
    v = inst.d;
    if (v !== pInst.d) pInst.c.id = pInst.d = v;
    v = inst.f;
    if (v !== pInst.f) pInst.e.id = pInst.f = v;
    v = inst.h;
    if (v !== pInst.h) pInst.g.id = pInst.h = v;
    v = inst.j;
    if (v !== pInst.j) pInst.i.id = pInst.j = v;
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpecNode = null,
    _xvdomSpecNodeCreate = function () {
  var _n = _xvdomEl("a"),
      _n2 = _xvdomEl("b"),
      _n3 = _xvdomEl("e"),
      _n4 = _xvdomEl("i"),
      _n5 = _xvdomEl("j"),
      _n6 = _xvdomEl("l");

  _n.appendChild(_n2);

  _n2 = _xvdomEl("d");

  _n.appendChild(_n2);

  _n2.appendChild(_n3);

  _n3.appendChild(_n4);

  _n4.appendChild(_n5);

  _n5.appendChild(_n6);

  _n5 = _xvdomEl("k");

  _n4.appendChild(_n5);

  _n6 = _xvdomEl("m");

  _n5.appendChild(_n6);

  _n3 = _xvdomEl("f");

  _n2.appendChild(_n3);

  _n3 = _xvdomEl("g");

  _n2.appendChild(_n3);

  _n4 = _xvdomEl("h");

  _n3.appendChild(_n4);

  _n2 = _xvdomEl("c");

  _n.appendChild(_n2);

  return _n;
};

var var1 = 1;

({
  $s: _xvdomSpec,
  b: var1,
  d: var1,
  f: var1,
  h: var1,
  j: var1
});
