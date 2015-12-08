"use strict";

var _xvdomSpec = {
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
var message1 = "hello";

({
  spec: _xvdomSpec,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: message1,
  c: null,
  d: null
});
