var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span");

    _n.appendChild(_n2);

    inst.a = _xvdomCreateDynamic(_n, inst.b);
    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(pInst.b, pInst.b = inst.b, pInst.a);
  },

  r: xvdom.DEADPOOL
},
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var message1 = "hello";

({
  s: _xvdomSpec,
  v: {
    b: message1
  }
});
