"use strict";

var _xvdomSpec = {
  render: function render(inst) {
    var _n = document.createElement("div"),
        _n2;

    _n.appendChild(xvdom.createDynamic(inst.v0, inst, "r0", "c0"));

    _n2 = document.createElement("span");

    _n2.appendChild(xvdom.createDynamic(inst.v1, inst, "r1", "c1"));

    _n.appendChild(_n2);

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.v0 = pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
    }

    if (inst.v1 !== pInst.v1) {
      pInst.v1 = pInst.r1(inst.v1, pInst.v1, pInst.c1, pInst, "r1", "c1");
    }
  }
};
var message1 = "hello";
var message2 = "world";

({
  spec: _xvdomSpec,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  v0: message1,
  r0: null,
  c0: null,
  v1: message2,
  r1: null,
  c1: null
});
