"use strict";

var _xvdomCreateComponent = xvdom.createComponent,
    _xvdomEl = xvdom.el,
    _xvdomUpdateComponent = xvdom.updateComponent;
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div"),
        _n2;

    _n2 = (inst.c = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.a,
      msg2: inst.b,
      one: 1,
      two: "two"
    }, inst)).$n;

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a || inst.b !== pInst.b) {
      pInst.c = _xvdomUpdateComponent(MyComponent, MyComponent.state, {
        msg: pInst.a = inst.a,
        msg2: pInst.b = inst.b,
        one: 1,
        two: "two"
      }, pInst.c);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = (inst.c = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.a,
      msg2: inst.b,
      one: 1,
      two: "two"
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a || inst.b !== pInst.b) {
      pInst.c = _xvdomUpdateComponent(MyComponent, MyComponent.state, {
        msg: pInst.a = inst.a,
        msg2: pInst.b = inst.b,
        one: 1,
        two: "two"
      }, pInst.c);
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
