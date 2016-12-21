var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n, _n.innerText = _xvdomText(inst.b);
    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a.firstChild.data = _xvdomText(pInst.b = inst.b);
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n, _n.innerText = _xvdomText(inst.b);
    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a.firstChild.data = _xvdomText(pInst.b = inst.b);
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpec3 = {
  c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n, _n.innerText = _xvdomText(inst.b);
    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a.firstChild.data = _xvdomText(pInst.b = inst.b);
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpec4 = {
  c(inst) {
    var _n = _xvdomEl("div");

    inst.a = _n, _n.innerText = _xvdomText(inst.b);
    return _n;
  },

  u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a.firstChild.data = _xvdomText(pInst.b = inst.b);
  },

  r: xvdom.DEADPOOL
},
    _xvdomText = xvdom.text;
var message1 = "hello";
var message2 = "world";
function translate(str) {
  return str;
}

({
  $s: _xvdomSpec,
  b: message2[0]
});
({
  $s: _xvdomSpec2,
  b: message2 + "hello"
});
({
  $s: _xvdomSpec3,
  b: translate(message2)
});
({
  $s: _xvdomSpec4,
  b: message2.length
});
