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

var _xvdomSpec2 = {
  render: function render(inst) {
    var _n = document.createElement("div"),
        _n2,
        _n3;

    _n2 = document.createElement("h1");

    _n2.appendChild(document.createTextNode(("Hello World") || ""));

    _n.appendChild(_n2);

    _n2 = document.createElement("div");

    _n2.appendChild(document.createElement("div"));

    _n.appendChild(_n2);

    _n2 = document.createElement("div");
    _n2.className = "my-class";
    _n3 = document.createElement("div");
    inst.c0 = _n3;
    _n3.className = inst.v0;

    _n2.appendChild(_n3);

    _n.appendChild(_n2);

    _n2 = document.createElement("input");
    _n2.type = "text";
    _n2.disabled = true;

    _n.appendChild(_n2);

    _n.appendChild(xvdom.createDynamic(inst.v1, inst, "r1", "c1"));

    _n2 = document.createElement("div");
    _n2.className = "myClass";

    _n.appendChild(_n2);

    return _n;
  },
  rerender: function rerender(inst, pInst) {
    if (inst.v0 !== pInst.v0) {
      pInst.c0.className = inst.v0;
      pInst.v0 = inst.v0;
    }

    if (inst.v1 !== pInst.v1) {
      pInst.v1 = pInst.r1(inst.v1, pInst.v1, pInst.c1, pInst, "r1", "c1");
    }
  }
};
var _xvdomSpec = {
  render: function render() {
    var _n = document.createElement("div");

    return _n;
  },
  rerender: function rerender() {}
};
({
  spec: _xvdomSpec2,
  _node: null,
  component: null,
  state: null,
  actions: null,
  props: null,
  v0: myClass,
  r0: null,
  c0: null,
  v1: queries.map(function (query) {
    return {
      spec: _xvdomSpec,
      _node: null,
      component: null,
      state: null,
      actions: null,
      props: null,
      key: query.id
    };
  }),
  r1: null,
  c1: null
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
