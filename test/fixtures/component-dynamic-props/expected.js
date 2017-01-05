var _xvdomCreateComponent = xvdom.createComponent,
    _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c(inst, ctx) {
    var _n = (ctx.a = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.a,
      msg2: inst.b,
      one: 1,
      two: "two"
    })).$n;

    return _n;
  },

  u(inst, pInst, ctx) {
    if (inst.a !== pInst.a || inst.b !== pInst.b) ctx.a = _xvdomUpdateComponent(MyComponent, MyComponent.state, {
      msg: pInst.a = inst.a,
      msg2: pInst.b = inst.b,
      one: 1,
      two: "two"
    }, ctx.a);
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c(inst, ctx) {
    var _n = _xvdomEl("div"),
        _n2 = (ctx.a = _xvdomCreateComponent(MyComponent, MyComponent.state, {
      msg: inst.a,
      msg2: inst.b,
      one: 1,
      two: "two"
    })).$n;

    _n.appendChild(_n2);

    return _n;
  },

  u(inst, pInst, ctx) {
    if (inst.a !== pInst.a || inst.b !== pInst.b) ctx.a = _xvdomUpdateComponent(MyComponent, MyComponent.state, {
      msg: pInst.a = inst.a,
      msg2: pInst.b = inst.b,
      one: 1,
      two: "two"
    }, ctx.a);
  },

  r: xvdom.DEADPOOL
},
    _xvdomUpdateComponent = xvdom.updateComponent;
function MyComponent() {}

var message = "hello world";
var message2 = "goodbye";

({
  s: _xvdomSpec,
  v: {
    a: message,
    b: message2
  },
  c: null
});

({
  s: _xvdomSpec2,
  v: {
    a: message,
    b: message2
  },
  c: null
});
