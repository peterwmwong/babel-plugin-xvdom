"use strict";

var _xvdomSpec = {
  render: function render(inst) {
    var _n = document.createElement("div");

    inst.c0 = _n;
    _n.className = inst.v0;
    _n.id = inst.v1;
    _n.title = inst.v2;

    _n.appendChild(xvdom.createDynamic(inst.v3, inst, "r3", "c3"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.c0.className = inst.v0;
      pInst.v0 = inst.v0;
    }

    if (inst.v1 !== pInst.v1) {
      pInst.c0.id = inst.v1;
      pInst.v1 = inst.v1;
    }

    if (inst.v2 !== pInst.v2) {
      pInst.c0.title = inst.v2;
      pInst.v2 = inst.v2;
    }

    if (inst.v3 !== pInst.v3) {
      pInst.v3 = pInst.r3(inst.v3, pInst.v3, pInst.c3, pInst, "r3", "c3");
    }
  }
};
var one = "1";
var two = "2";
var three = "3";
var four = "4";

({
  spec: _xvdomSpec,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  v0: one,
  r0: null,
  c0: null,
  v1: two,
  r1: null,
  v2: three,
  r2: null,
  v3: four,
  r3: null,
  c3: null
});
