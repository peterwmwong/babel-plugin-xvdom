var _xvdomSpec5 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.v0, inst, "r0", "c0"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
      pInst.v0 = inst.v0;
    }
  }
};
var _xvdomSpec4 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.v0, inst, "r0", "c0"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
      pInst.v0 = inst.v0;
    }
  }
};
var _xvdomSpec3 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.appendChild(xvdom.createDynamic(inst.v0, inst, "r0", "c0"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
      pInst.v0 = inst.v0;
    }
  }
};
var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.className = inst.v0;
    _n.title = inst.v1;
    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.c0.className = inst.v0;
      pInst.v0 = inst.v0;
    }

    if (inst.v1 !== pInst.v1) {
      pInst.c1.title = inst.v1;
      pInst.v1 = inst.v1;
    }
  }
};
var _xvdomSpec = {
  render: function render(inst) {
    var _n = document.createElement("div");

    _n.className = inst.v0;
    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.c0.className = inst.v0;
      pInst.v0 = inst.v0;
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
  v0: msg,
  r0: null,
  c0: null
});

({
  spec: _xvdomSpec2,
  _node: null,
  v0: msg + "hello",
  r0: null,
  c0: null,
  v1: translate(msg),
  r1: null,
  c1: null
});

({
  spec: _xvdomSpec3,
  _node: null,
  v0: msg,
  r0: null,
  c0: null
});

({
  spec: _xvdomSpec4,
  _node: null,
  v0: msg + "hello",
  r0: null,
  c0: null
});

({
  spec: _xvdomSpec5,
  _node: null,
  v0: translate(msg),
  r0: null,
  c0: null
});
