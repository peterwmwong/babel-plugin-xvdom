"use strict";

var _xvdomSpec = {
  c: function c(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      msg: inst.a,
      msg2: inst.b,
      one: 1,
      two: "two"
    }, inst, "c", "d", "e");

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.a !== pInst.a || inst.b !== pInst.b) {
      pInst.c(MyComponent, {
        msg: inst.a,
        msg2: inst.b,
        one: 1,
        two: "two"
      }, null, pInst.e, pInst.d, pInst, "d", "e");
      pInst.a = inst.a;
      pInst.b = inst.b;
    }
  },
  r: xvdom.DEADPOOL
};
function MyComponent() {}

var message = "hello world";
var message2 = "goodbye";

({
  $s: _xvdomSpec,
  a: message,
  b: message2
});
