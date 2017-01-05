var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst, ctx) {
    var _n = _xvdomEl("div");

    ctx.a = _n, _n.innerText = _xvdomText(inst.a);
    return _n;
  },

  u(inst, pInst, ctx) {
    if (inst.a !== pInst.a) ctx.a.innerText = _xvdomText(pInst.a = inst.a);
  },

  r: xvdom.DEADPOOL
},
    _xvdomText = xvdom.text;
var message1 = "hello";

({
  s: _xvdomSpec,
  v: {
    a: message1
  },
  c: null
});
