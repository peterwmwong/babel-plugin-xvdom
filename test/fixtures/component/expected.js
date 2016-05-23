"use strict";

var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = document.createElement("div"),
        _n2;

    _n2 = xvdom.createComponent(MyComponent, MyComponent.state, {
      b: "goodbye"
    }, inst, "a", "b");

    _n.appendChild(_n2);

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = xvdom.createComponent(MyComponent, MyComponent.state, {
      a: "hello"
    }, inst, "a", "b");

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = xvdom.createComponent(MyComponent, MyComponent.state, null, inst, "a", "b");

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
