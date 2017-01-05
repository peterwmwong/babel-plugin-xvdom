var _xvdomCreateDynamicOnlyChild = xvdom.createDynamicOnlyChild,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst, ctx) {
    var _n = _xvdomEl("div");

    ctx.a = _xvdomCreateDynamicOnlyChild(_n, inst.a);
    return _n;
  },

  u(inst, pInst, ctx) {
    if (inst.a !== pInst.a) ctx.a = _xvdomUpdateDynamicOnlyChild(pInst.a, pInst.a = inst.a, ctx.a);
  },

  r: xvdom.DEADPOOL
},
    _xvdomUpdateDynamicOnlyChild = xvdom.updateDynamicOnlyChild;
var message1 = "hello";

({
  s: _xvdomSpec,
  v: {
    a: message1
  },
  c: null
});
