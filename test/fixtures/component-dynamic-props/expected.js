"use strict";

var _xvdomCreateComponent = xvdom.createComponent,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c: function c(inst) {
    var _n = (inst.a = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.b,
      msg2: inst.c,
      one: 1,
      two: "two"
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b || inst.c !== pInst.c) pInst.a = _xvdomUpdateComponent(MyComponent, MyComponent.state, {
      msg: pInst.b = inst.b,
      msg2: pInst.c = inst.c,
      one: 1,
      two: "two"
    }, pInst.a);
  },
  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = (inst.a = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.b,
      msg2: inst.c,
      one: 1,
      two: "two"
    }, inst)).$n;

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    if (inst.b !== pInst.b || inst.c !== pInst.c) pInst.a = _xvdomUpdateComponent(MyComponent, MyComponent.state, {
      msg: pInst.b = inst.b,
      msg2: pInst.c = inst.c,
      one: 1,
      two: "two"
    }, pInst.a);
  },
  r: xvdom.DEADPOOL
},
    _xvdomUpdateComponent = xvdom.updateComponent;
function MyComponent() {}

var message = "hello world";
var message2 = "goodbye";

({
  $s: _xvdomSpec,
  b: message,
  c: message2
});

({
  $s: _xvdomSpec2,
  b: message,
  c: message2
});
