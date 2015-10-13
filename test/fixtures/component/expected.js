var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, {
      a: "hello"
    }, inst, "r0", "c0", "w0");

    return _n;
  }
};
var _xvdomSpec = {
  render: function render(inst) {
    var _n = xvdom.createComponent(MyComponent, null, inst, "r0", "c0", "w0");

    return _n;
  }
};
function MyComponent() {}

({
  spec: _xvdomSpec,
  _node: null,
  r0: null,
  c0: null
});

({
  spec: _xvdomSpec2,
  _node: null,
  r0: null,
  c0: null
});
