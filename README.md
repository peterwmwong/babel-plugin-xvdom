# babel-plugin-xvdom

Turn jsx into [xvdom](https://github.com/peterwmwong/xvdom).

## TODO

- Add stateful component instance properties:
  - `component`
  - `state`
  - `actions`
  - `props`

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

({
  node: null,
  template: {
    el: "div",
    children: [{
      el: "h1",
      children: ["Hello World"]
    }, {
      el: "div",
      props: {
        key: "1"
      },
      children: [{
        node: null,
        template: {
          el: "div",
          props: {
            key$: 0
          }
        },
        values: [key]
      }]
    }, {
      el: "div",
      props: {
        className: "my-class"
      },
      children: [{
        node: null,
        template: {
          el: "div",
          props: {
            className$: 0
          }
        },
        values: [myClass]
      }]
    }, {
      el: "input",
      props: {
        type: "text"
      }
    }, 0, {
      el: "div",
      props: {
        className: "myClass",
        key: "test"
      }
    }]
  },
  values: [queries.map(function (query) {
    return {
      el: "div",
      props: {
        key: query.id
      }
    };
  })]
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
  "blacklist": ["react"],
  "plugins": ["xvdom"]
}
```

### Via CLI

```sh
$ babel --blacklist react --plugins xvdom script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  blacklist: ["react"],
  plugins: ["xvdom"]
});
```
