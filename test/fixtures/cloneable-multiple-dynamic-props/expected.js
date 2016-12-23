var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true),
        _n2;

    (inst.a = _n2 = _n.firstChild).className = inst.b;
    _n2.id = inst.c;
    return _n;
  },

  u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
    v = inst.c;
    if (v !== pInst.c) pInst.a.id = pInst.c = v;
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpecNode = null,
    _xvdomSpecNodeCreate = function () {
  var _n = _xvdomEl("div"),
      _n2 = _xvdomEl("span");

  _n.appendChild(_n2);

  return _n;
};

var var1 = 1;
var var2 = 2;

({
  s: _xvdomSpec,
  v: {
    b: var1,
    c: var2
  }
});
