"use strict";

var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    inst.c0 = _n;
    _n.id = inst.v0;

    _n.appendChild(xvdom.createDynamic(inst.v1, inst, "r1", "c1"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.c0.id = inst.v0;
      pInst.v0 = inst.v0;
    }

    if (inst.v1 !== pInst.v1) {
      pInst.v1 = pInst.r1(inst.v1, pInst.v1, pInst.c1, pInst, "r1", "c1");
    }
  }
};
var _xvdomSpec = {
  render: function render(inst) {
    var _n = document.createElement("span");

    _n.appendChild(xvdom.createDynamic(inst.v0, inst, "r0", "c0"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.v0 = pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
    }
  }
};
var list = [1, 2, 3];
var id = "blah";

({
  spec: _xvdomSpec2,
  _node: null,
  component: null,
  state: null,
  dispatch: null,
  props: null,
  v0: id,
  r0: null,
  c0: null,
  v1: list.map(function (el) {
    return {
      spec: _xvdomSpec,
      _node: null,
      component: null,
      state: null,
      dispatch: null,
      props: null,
      v0: el,
      r0: null,
      c0: null
    };
  }),
  r1: null,
  c1: null
});
