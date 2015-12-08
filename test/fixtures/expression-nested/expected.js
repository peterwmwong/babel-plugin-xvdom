"use strict";

var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.id = inst.b;

    _n.appendChild(xvdom.createDynamic(inst.g, inst, "h", "i"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.id = inst.b;
      pInst.b = inst.b;
    }

    if (inst.g !== pInst.g) {
      pInst.g = pInst.h(inst.g, pInst.g, pInst.i, pInst, "h", "i");
    }
  }
};
var _xvdomSpec = {
  render: function render(inst) {
    var _n = document.createElement("span");

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
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
  actions: null,
  props: null,
  b: id,
  c: null,
  d: null,
  g: list.map(function (el) {
    return {
      spec: _xvdomSpec,
      _node: null,
      component: null,
      state: null,
      actions: null,
      props: null,
      b: el,
      c: null,
      d: null
    };
  }),
  h: null,
  i: null
});
