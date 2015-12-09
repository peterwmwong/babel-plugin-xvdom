"use strict";

var _xvdomSpec7 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec6 = {
  c: function c() {
    var _n = document.createElement("div");

    _n.appendChild(document.createTextNode(("hello" + 5) || ""));

    return _n;
  },
  u: function u() {}
};
var _xvdomSpec5 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec4 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.className = inst.b;
    _n.title = inst.g;
    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.className = inst.b;
      pInst.b = inst.b;
    }

    if (inst.g !== pInst.g) {
      pInst.d.title = inst.g;
      pInst.g = inst.g;
    }
  }
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.className = inst.b;
    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.className = inst.b;
      pInst.b = inst.b;
    }
  }
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
  b: msg,
  c: null,
  d: null
});
({
  $s: _xvdomSpec2,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: msg + "hello",
  c: null,
  d: null,
  g: translate(msg),
  h: null
});
({
  $s: _xvdomSpec3,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: msg,
  c: null,
  d: null
});
({
  $s: _xvdomSpec4,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: msg + "hello",
  c: null,
  d: null
});
({
  $s: _xvdomSpec5,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: translate(msg),
  c: null,
  d: null
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
  b: msg.length,
  c: null,
  d: null
});
