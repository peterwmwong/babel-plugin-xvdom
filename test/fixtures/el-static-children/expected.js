var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c() {
    var _n = _xvdomEl("div");

    _n.textContent = "hello world";
    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c() {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span"),
        _n3 = _xvdomEl("a");

    _n.appendChild(_n2);

    _n2.appendChild(_n3);

    _n3 = _xvdomEl("b");

    _n2.appendChild(_n3);

    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
},
    _xvdomSpec3 = {
  c() {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("span"),
        _n3 = _xvdomEl("a");

    _n.appendChild(_n2);

    _n3.className = "two";

    _n2.appendChild(_n3);

    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
},
    _xvdomSpec4 = {
  c() {
    var _n = _xvdomEl("div");

    _n.textContent = "hello";
    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
},
    _xvdomSpec5 = {
  c() {
    var _n = _xvdomEl("div");

    _n.textContent = "hello" + 5;
    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
},
    _xvdomSpec6 = {
  c() {
    var _n = _xvdomEl("div");

    _n.textContent = !"hello";
    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
};
({
  s: _xvdomSpec
});

({
  s: _xvdomSpec2
});

({
  s: _xvdomSpec3
});

({
  s: _xvdomSpec4
});
({
  s: _xvdomSpec5
});
({
  s: _xvdomSpec6
});
