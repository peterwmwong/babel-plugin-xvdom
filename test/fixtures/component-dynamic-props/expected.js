var _xvdomSpec = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      msg: inst.p0msg,
      msg2: inst.p0msg2,
      one: 1,
      two: "two"
    }, inst, "r0", "c0", "w0");

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.p0msg !== pInst.p0msg || inst.p0msg2 !== pInst.p0msg2) {
      pInst.r0(MyComponent, {
        msg: inst.p0msg,
        msg2: inst.p0msg2,
        one: 1,
        two: "two"
      }, null, pInst.w0, pInst.c0, pInst, "r0", "c0", "w0");
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
  r0: null,
  c0: null,
  w0: null,
  p0msg: message,
  p0msg2: message2
});
