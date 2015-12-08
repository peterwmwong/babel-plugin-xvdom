"use strict";

var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      a: "hello"
    }, inst, "b", "c", "d");

    return _n;
  },
  rerender: function rerender() {}
};
var _xvdomSpec = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, null, inst, "b", "c", "d");

    return _n;
  },
  rerender: function rerender() {}
};
function MyComponent() {}

({
  spec: _xvdomSpec,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: null,
  c: null,
  d: null
});

({
  spec: _xvdomSpec2,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  b: null,
  c: null,
  d: null
});
