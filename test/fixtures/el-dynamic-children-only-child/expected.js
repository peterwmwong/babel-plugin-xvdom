var _xvdomCreateDynamicOnlyChild = xvdom.createDynamicOnlyChild,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _xvdomCreateDynamicOnlyChild(_n, inst.b);
    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamicOnlyChild(pInst.b, pInst.b = inst.b, pInst.a);
  },

  r: xvdom.DEADPOOL
},
    _xvdomUpdateDynamicOnlyChild = xvdom.updateDynamicOnlyChild;
var message1 = "hello";

({
  s: _xvdomSpec,
  v: {
    b: message1
  }
});
