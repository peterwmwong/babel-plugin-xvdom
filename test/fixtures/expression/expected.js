"use strict";

var _xvdomSpec7 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec6 = {
  render: function render() {
    var _n = document.createElement("div");

    _n.appendChild(document.createTextNode(("hello" + 5) || ""));

    return _n;
  },
  rerender: function rerender() {}
};
var _xvdomSpec5 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec4 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec3 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }
  }
};
var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.className = inst.b;
    _n.title = inst.g;
    return _n;
  },
  rerender: function rerender(inst, pInst) {
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
  render: function render(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.className = inst.b;
    return _n;
  },
  rerender: function rerender(inst, pInst) {
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
  spec: _xvdomSpec,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: msg,
  c: null,
  d: null
});
({
  spec: _xvdomSpec2,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: msg + "hello",
  c: null,
  d: null,
  g: translate(msg),
  h: null
});
({
  spec: _xvdomSpec3,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: msg,
  c: null,
  d: null
});
({
  spec: _xvdomSpec4,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: msg + "hello",
  c: null,
  d: null
});
({
  spec: _xvdomSpec5,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: translate(msg),
  c: null,
  d: null
});
({
  spec: _xvdomSpec6,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null
});
({
  spec: _xvdomSpec7,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: msg.length,
  c: null,
  d: null
});
