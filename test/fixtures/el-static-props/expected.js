"use strict";

var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c: function c() {
    var _n = _xvdomEl("div");

    _n.className = "my-class";
    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c: function c() {
    var _n = _xvdomEl("input");

    _n.disabled = true;
    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
},
    _xvdomSpec3 = {
  c: function c() {
    var _n = _xvdomEl("input");

    _n.disabled = false;
    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
},
    _xvdomSpec4 = {
  c: function c() {
    var _n = _xvdomEl("input");

    _n.disabled = !false;
    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
},
    _xvdomSpec5 = {
  c: function c() {
    var _n = _xvdomEl("input");

    _n.disabled = false || true;
    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
({
  $s: _xvdomSpec
});
({
  $s: _xvdomSpec2
});
({
  $s: _xvdomSpec3
});
({
  $s: _xvdomSpec4
});
({
  $s: _xvdomSpec5
});
