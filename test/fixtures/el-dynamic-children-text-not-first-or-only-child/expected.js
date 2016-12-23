var _xvdomCreateText = xvdom.createText,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span");

    _n.appendChild(_n2);

    _n.appendChild(inst.a = _xvdomCreateText(inst.b));

    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a.data = _xvdomText(pInst.b = inst.b);
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
