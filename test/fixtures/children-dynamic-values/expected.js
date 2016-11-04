"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span");

    _n.appendChild(inst.a = _xvdomCreateDynamic(false, _n, inst.b));

    _n.appendChild(_n2);

    _n2.appendChild(inst.c = _xvdomCreateDynamic(true, _n2, inst.d));

    _n2 = _xvdomEl("span");

    _n.appendChild(_n2);

    _n2.appendChild(inst.e = _xvdomCreateDynamic(true, _n2, inst.f));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) pInst.a = _xvdomUpdateDynamic(false, pInst.b, pInst.b = inst.b, pInst.a);
    if (inst.d !== pInst.d) pInst.c = _xvdomUpdateDynamic(true, pInst.d, pInst.d = inst.d, pInst.c);
    if (inst.f !== pInst.f) pInst.e = _xvdomUpdateDynamic(true, pInst.f, pInst.f = inst.f, pInst.e);
  },
  r: xvdom.DEADPOOL
};
var message1 = "hello";
var message2 = "world";

({
  $s: _xvdomSpec,
  b: message1,
  d: message2,
  f: message2[0]
});
