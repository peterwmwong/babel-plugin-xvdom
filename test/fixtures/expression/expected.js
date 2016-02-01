"use strict";

var _xvdomSpec7 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
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

    _n.appendChild(xvdom.createDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec4 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a) {
      pInst.a = pInst.b(true, inst.a, pInst.a, pInst.c, pInst, "b", "c");
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(true, _n, inst.a, inst, "b", "c"));

    return _n;
  },
  u: function u(inst, pInst) {
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
    if (inst.a !== pInst.a) {
      pInst.b.className = inst.a;
      pInst.a = inst.a;
    }

    if (inst.c !== pInst.c) {
      pInst.b.title = inst.c;
      pInst.c = inst.c;
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
    if (inst.a !== pInst.a) {
      pInst.b.className = inst.a;
      pInst.a = inst.a;
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
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: msg,
  b: null
});
({
  $s: _xvdomSpec2,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: msg + "hello",
  b: null,
  c: translate(msg)
});
({
  $s: _xvdomSpec3,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: msg,
  b: null,
  c: null
});
({
  $s: _xvdomSpec4,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: msg + "hello",
  b: null,
  c: null
});
({
  $s: _xvdomSpec5,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: translate(msg),
  b: null,
  c: null
});
({
  $s: _xvdomSpec6,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null
});
({
  $s: _xvdomSpec7,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  a: msg.length,
  b: null,
  c: null
});
