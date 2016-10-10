"use strict";

var _xvdomEl = xvdom.el;
var _xvdomSpec3 = {
  c: function c() {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span"),
        _n3 = _xvdomEl("a");

    _n.appendChild(_n2);

    _n3.className = "two";

    _n2.appendChild(_n3);

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c() {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span"),
        _n3 = _xvdomEl("a");

    _n.appendChild(_n2);

    _n2.appendChild(_n3);

    _n3 = _xvdomEl("b");

    _n2.appendChild(_n3);

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c() {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span"),
        _n3 = _xvdomEl("a");

    _n.appendChild(_n2);

    _n2.appendChild(_n3);

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
