var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst, ctx) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span");

    _n.appendChild(_n2);

    ctx.a = _xvdomCreateDynamic(_n, inst.a);
    return _n;
  },

  u(inst, pInst, ctx) {
    if (inst.a !== pInst.a) ctx.a = _xvdomUpdateDynamic(pInst.a, pInst.a = inst.a, ctx.a);
  },

  r: xvdom.DEADPOOL
},
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var message1 = "hello";

({
  s: _xvdomSpec,
  v: {
    a: message1
  },
  c: null
});
