"use strict";

var _xvdomCreateComponent = xvdom.createComponent,
    _xvdomEl = xvdom.el;
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div"),
        _n2;

    _n2 = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.a,
      msg2: inst.b,
      one: 1,
      two: "two"
    }, inst, "c", "d");

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a || inst.b !== pInst.b) {
      pInst.c(MyComponent, {
        msg: inst.a,
        msg2: inst.b,
        one: 1,
        two: "two"
      }, pInst.d, pInst, "d");
      pInst.a = inst.a;
      pInst.b = inst.b;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.a,
      msg2: inst.b,
      one: 1,
      two: "two"
    }, inst, "c", "d");

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a || inst.b !== pInst.b) {
      pInst.c(MyComponent, {
        msg: inst.a,
        msg2: inst.b,
        one: 1,
        two: "two"
      }, pInst.d, pInst, "d");
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

({
  $s: _xvdomSpec2,
  a: message,
  b: message2
});
