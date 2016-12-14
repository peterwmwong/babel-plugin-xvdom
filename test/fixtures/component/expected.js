var _xvdomCreateComponent = xvdom.createComponent,
    _xvdomSpec = {
  c(inst) {
    var _n = _xvdomCreateComponent(MyComponent, MyComponent.state, null, inst).$n;

    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
};
function MyComponent() {}

({
  $s: _xvdomSpec
});
