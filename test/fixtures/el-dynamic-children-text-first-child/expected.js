var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span");

    inst.a = _n, _n.innerText = _xvdomText(inst.b);

    _n.appendChild(_n2);

    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a.firstChild.data = _xvdomText(pInst.b = inst.b);
  },

  r: xvdom.DEADPOOL
},
    _xvdomText = xvdom.text;
var message1 = "hello";

({
  $s: _xvdomSpec,
  b: message1
});
