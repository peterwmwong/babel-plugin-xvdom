"use strict";

var _xvdomSpec = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      msg: inst.p0msg,
      msg2: inst.p0msg2,
      one: 1,
      two: "two"
    }, inst, "b", "c", "d");

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.p0msg !== pInst.p0msg || inst.p0msg2 !== pInst.p0msg2) {
      pInst.b(MyComponent, {
        msg: inst.p0msg,
        msg2: inst.p0msg2,
        one: 1,
        two: "two"
      }, null, pInst.d, pInst.c, pInst, "c", "d");
      pInst.p0msg = inst.p0msg;
      pInst.p0msg2 = inst.p0msg2;
    }
  }
};
function MyComponent() {}

var message = "hello world";
var message2 = "goodbye";

({
  spec: _xvdomSpec,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: null,
  c: null,
  d: null,
  p0msg: message,
  p0msg2: message2
});
