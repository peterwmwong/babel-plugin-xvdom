"use strict";

var _xvdomCreateComponent = xvdom.createComponent,
    _xvdomEl = xvdom.el;
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = _xvdomEl("div"),
        _n2;

    _n2 = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      b: "goodbye"
    }, inst).$n;

    _n.appendChild(_n2);

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      a: "hello"
    }, inst).$n;

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomCreateComponent(MyComponent, MyComponent.state, null, inst).$n;

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
function MyComponent() {}

({
  $s: _xvdomSpec
});

({
  $s: _xvdomSpec2
});

({
  $s: _xvdomSpec3
});
