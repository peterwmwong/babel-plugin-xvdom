var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n, _n.innerText = _xvdomText(inst.b);
    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a.innerText = _xvdomText(pInst.b = inst.b);
  },

  r: xvdom.DEADPOOL
},
    _xvdomText = xvdom.text;
var message1 = "hello";

({
  s: _xvdomSpec,
  v: {
    b: message1
  }
});
