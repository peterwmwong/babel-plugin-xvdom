var _xvdomEl = xvdom.el,
    _xvdomSpec = {
  c() {
    var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true);

    return _n;
  },

  u() {},

  r: xvdom.DEADPOOL
},
    _xvdomSpecNode = null,
    _xvdomSpecNodeCreate = function () {
  var _n = _xvdomEl("div"),
      _n2 = _xvdomEl("div");

  _n2.className = "my-class";

  _n.appendChild(_n2);

  _n2 = _xvdomEl("input");
  _n2.disabled = true;

  _n.appendChild(_n2);

  _n2 = _xvdomEl("input");
  _n2.disabled = false;

  _n.appendChild(_n2);

  _n2 = _xvdomEl("input");
  _n2.disabled = !false;

  _n.appendChild(_n2);

  _n2 = _xvdomEl("input");
  _n2.disabled = false || true;

  _n.appendChild(_n2);

  return _n;
};

({
  $s: _xvdomSpec
});