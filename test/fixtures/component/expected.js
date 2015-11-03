"use strict";

var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      a: "hello"
    }, inst, "r0", "c0", "w0");

    return _n;
  },
  rerender: function rerender() {}
};
var _xvdomSpec = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, null, inst, "r0", "c0", "w0");

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
  r0: null,
  c0: null,
  w0: null
});

({
  spec: _xvdomSpec2,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  r0: null,
  c0: null,
  w0: null
});
