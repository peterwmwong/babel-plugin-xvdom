var _xvdomEl = xvdom.el,
    _xvdomJsx = xvdom.jsx,
    _xvdomSpec = {
  c(inst) {
    var v = inst.v,
        a,
        _n = _xvdomEl("div");

    (a = _n).className = v.a;
    inst.c = {
      a
    };
    _n.xvdom = inst;
    return inst.n = _n;
  },

  u(v, pv, c) {
    if (v.a !== pv.a) c.a.className = v.a;
    pv.z = _xvdomSpecValuesHead;
    _xvdomSpecValuesHead = pv;
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpec2 = {
  c(inst) {
    var v = inst.v,
        a,
        _n = _xvdomEl("div");

    (a = _n).className = v.a;
    _n.title = v.b;
    inst.c = {
      a
    };
    _n.xvdom = inst;
    return inst.n = _n;
  },

  u(v, pv, c) {
    if (v.a !== pv.a) c.a.className = v.a;
    if (v.b !== pv.b) c.a.title = v.b;
    pv.z = _xvdomSpec2ValuesHead;
    _xvdomSpec2ValuesHead = pv;
  },

  r: xvdom.DEADPOOL
},
    _xvdomSpec2Values = function (a, b) {
  if (_xvdomSpec2ValuesHead === null) return {
    a,
    b,
    z: null
  };
  var r = _xvdomSpec2ValuesHead;
  _xvdomSpec2ValuesHead = r.z;
  r.a = a;
  r.b = b;
  return r;
},
    _xvdomSpec2ValuesHead = null,
    _xvdomSpecValues = function (a) {
  if (_xvdomSpecValuesHead === null) return {
    a,
    z: null
  };
  var r = _xvdomSpecValuesHead;
  _xvdomSpecValuesHead = r.z;
  r.a = a;
  return r;
},
    _xvdomSpecValuesHead = null;

const msg = "hello";
function translate(str) {
  return str;
}

_xvdomJsx(_xvdomSpec, _xvdomSpecValues(msg));
_xvdomJsx(_xvdomSpec2, _xvdomSpec2Values(msg + "hello", translate(msg)));
