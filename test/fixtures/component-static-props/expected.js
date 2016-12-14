var _xvdomCreateComponent = xvdom.createComponent,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      a: "hello"
    }, inst).$n;

    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      b: "goodbye"
    }, inst).$n;

    _n.appendChild(_n2);

    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
};
function MyComponent() {}

({
  $s: _xvdomSpec
});

({
  $s: _xvdomSpec2
});
