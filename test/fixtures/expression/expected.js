"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic;
var _xvdomSpec7 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec6 = {
  c: function c() {
    var _n = document.createElement("div");

    _n.appendChild(document.createTextNode(("hello" + 5) || ""));

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec5 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec4 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(_xvdomCreateDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.b = _n;
    _n.className = inst.a;
    _n.title = inst.c;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.b.title = v;
      pInst.c = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.b = _n;
    _n.className = inst.a;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }
  },
  r: xvdom.DEADPOOL
};
var msg = "hello";
function translate(str) {
  return str;
}

({
  $s: _xvdomSpec,
  a: msg
});
({
  $s: _xvdomSpec2,
  a: msg + "hello",
  c: translate(msg)
});
({
  $s: _xvdomSpec3,
  a: msg
});
({
  $s: _xvdomSpec4,
  a: msg + "hello"
});
({
  $s: _xvdomSpec5,
  a: translate(msg)
});
({
  $s: _xvdomSpec6
});
({
  $s: _xvdomSpec7,
  a: msg.length
});
