var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = document.createElement("input");

    _n.disabled = inst.v0;
    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.c0.disabled = inst.v0;
      pInst.v0 = inst.v0;
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
var messageType = "unread";

({
  spec: _xvdomSpec,
  _node: null,
  v0: messageType,
  r0: null,
  c0: null
});
({
  spec: _xvdomSpec2,
  _node: null,
  v0: !messageType,
  r0: null,
  c0: null
});
