"use strict";

var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      a: "hello"
    }, inst, "b", "c", "d");

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = xvdom.createComponent(MyComponent, null, inst, "b", "c", "d");

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
