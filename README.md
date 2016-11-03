# babel-plugin-xvdom

Turn jsx into [xvdom](https://github.com/peterwmwong/xvdom).

## Example

**In**

```javascript
<div>
  <h1>Hello World</h1>

  <div key="1">
    <div key={key}></div>
  </div>

  <div className="my-class">
    <div className={myClass}></div>
  </div>

  <input type="text" disabled />

  {queries.map(query=>
    <div key={query.id}></div>
  )}

  <div className="myClass" key="test"></div>
</div>
```

**Out**

```javascript
"use strict";

var _xvdomCreateDynamic = xvdom.createDynamic,
    _xvdomEl = xvdom.el,
    _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = _xvdomEl("div"),
        _n2 = _xvdomEl("h1"),
        _n3 = _xvdomEl("div");

    _n.appendChild(_n2);

    _n2.appendChild(document.createTextNode(("Hello World") || ""));

    _n2 = _xvdomEl("div");

    _n.appendChild(_n2);

    _n2.appendChild(_n3);

    _n2 = _xvdomEl("div");
    _n2.className = "my-class";

    _n.appendChild(_n2);

    _n3 = _xvdomEl("div");
    inst.a = _n3;
    _n3.className = inst.b;

    _n2.appendChild(_n3);

    _n2 = _xvdomEl("input");
    _n2.type = "text";
    _n2.disabled = true;

    _n.appendChild(_n2);

    _n.appendChild(inst.c = _xvdomCreateDynamic(false, _n, inst.d));

    _n2 = _xvdomEl("div");
    _n2.className = "myClass";

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.b;
    if (v !== pInst.b) pInst.a.className = pInst.b = v;
    if (inst.d !== pInst.d) pInst.c = _xvdomUpdateDynamic(false, pInst.d, pInst.d = inst.d, pInst.c);
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c() {
    var _n = _xvdomEl("div");

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
({
  $s: _xvdomSpec2,
  b: myClass,
  d: queries.map(function (query) {
    return {
      $s: _xvdomSpec,
      key: query.id
    };
  })
});
```

## Installation

```sh
$ npm install babel-plugin-xvdom
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["syntax-jsx", "xvdom"]
}
```

### Via CLI

```sh
$ babel --plugins syntax-jsx --plugins xvdom script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["syntax-jsx", "xvdom"]
});
```

## TODO

- Pass xvdom.EMPTY_PROPS instead of null
- Update props on componentAPI, instead of generating objects
- Re-evaluate component argument generation
- `style-*` attributes
- `class-*` attributes
