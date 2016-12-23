var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomEl("div");

    (inst.a = _n).className = inst.b;
    return _n;
  },

  u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c(inst) {
    var _n = _xvdomEl("div");

    (inst.a = _n).className = inst.b;
    _n.title = inst.c;
    return _n;
  },

  u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
    v = inst.c;
    if (v !== pInst.c) pInst.a.title = pInst.c = v;
  },

  r: xvdom.DEADPOOL
};
const msg = "hello";
function translate(str) {
  return str;
}

({
  s: _xvdomSpec,
  v: {
    b: msg
  }
});
({
  s: _xvdomSpec2,
  v: {
    b: msg + "hello",
    c: translate(msg)
  }
});
