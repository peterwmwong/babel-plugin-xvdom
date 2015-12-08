"use strict";

var _xvdomSpec = {
  render: function render(inst) {
    var _n = document.createElement("div");

    inst.d = _n;
    _n.className = inst.b;
    _n.id = inst.g;
    _n.title = inst.k;

    _n.appendChild(xvdom.createDynamic(inst.o, inst, "p", "q"));

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.d.className = inst.b;
      pInst.b = inst.b;
    }

    if (inst.g !== pInst.g) {
      pInst.d.id = inst.g;
      pInst.g = inst.g;
    }

    if (inst.k !== pInst.k) {
      pInst.d.title = inst.k;
      pInst.k = inst.k;
    }

    if (inst.o !== pInst.o) {
      pInst.o = pInst.p(inst.o, pInst.o, pInst.q, pInst, "p", "q");
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
  b: one,
  c: null,
  d: null,
  g: two,
  h: null,
  k: three,
  l: null,
  o: four,
  p: null,
  q: null
});
