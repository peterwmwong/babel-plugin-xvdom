"use strict";

var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = document.createElement("input");

    inst.d = _n;
    _n.disabled = inst.b;
    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.disabled = inst.b;
      pInst.b = inst.b;
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
var messageType = "unread";

({
  spec: _xvdomSpec,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: messageType,
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
  b: !messageType,
  c: null,
  d: null
});
