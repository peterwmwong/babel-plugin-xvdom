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
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic(false, pInst.a, pInst.a = inst.a, pInst.b);
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic(true, pInst.c, pInst.c = inst.c, pInst.d);
    }

    if (inst.e !== pInst.e) {
      pInst.f = _xvdomUpdateDynamic(true, pInst.e, pInst.e = inst.e, pInst.f);
    }
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
