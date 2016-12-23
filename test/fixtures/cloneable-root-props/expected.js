var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true);

    (inst.a = _n).id = inst.b;
    _n.className = inst.c;
    return _n;
  },

  u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.id = pInst.b = v;
    v = inst.c;
    if (v !== pInst.c) pInst.a.className = pInst.c = v;
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpecNode = null,
    _xvdomSpecNodeCreate = function () {
  var _n = _xvdomEl("a");

  _n.title = "Maeve";
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
