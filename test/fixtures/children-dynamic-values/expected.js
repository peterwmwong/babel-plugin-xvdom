"use strict";

var _xvdomSpec = {
  render: function render(inst) {
    var _n = document.createElement("div"),
        _n2;

    _n.appendChild(xvdom.createDynamic(inst.b, inst, "c", "d"));

    _n2 = document.createElement("span");

    _n2.appendChild(xvdom.createDynamic(inst.g, inst, "h", "i"));

    _n.appendChild(_n2);

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.b !== pInst.b) {
      pInst.b = pInst.c(inst.b, pInst.b, pInst.d, pInst, "c", "d");
    }

    if (inst.g !== pInst.g) {
      pInst.g = pInst.h(inst.g, pInst.g, pInst.i, pInst, "h", "i");
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
  b: message1,
  c: null,
  d: null,
  g: message2,
  h: null,
  i: null
});
