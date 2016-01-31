"use strict";

var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      a: "hello"
    }, inst, "b", "c", "d");

    return _n;
  },
  u: function u() {},
  r: xvdom.DeadPool
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = xvdom.createComponent(MyComponent, null, inst, "b", "c", "d");

    return _n;
  },
  u: function u() {},
  r: xvdom.DeadPool
};
function MyComponent() {}

({
  $s: _xvdomSpec,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: null,
  c: null,
  d: null
});

({
  $s: _xvdomSpec2,
  $n: null,
  $c: null,
  $t: null,
  $a: null,
  $p: null,
  b: null,
  c: null,
  d: null
});
