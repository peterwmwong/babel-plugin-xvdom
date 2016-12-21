## Unit/Integration specs for pathing algorithm

## Code Generation Cloneable: unused temporary variables

See `cloneable-saved-path-nodes/expected.js`, notice _n6 is unused.

## Code Generation: Cloneable paths to member expression

Currently `fragment_create.js cloneableDynamicPropCode()` is a bit complicated.
Let's reconsider how generate this path and look for opportunities for
simplification...

- Can we first look traverse the path in the right order. For example, build a
  list of `Path`'s starting from a `path`'s nearest saved `path`?

## API

```jsx
xvdom.s = v => v != null ? v : '';
xvdom.t = v => document.createTextNode(xvdom.s(v));
```

## Code Generation Optimization: createDynamicText/updateDynamicText if firstChild

```jsx
// First child
<div>
  {textual}
  <span />
</div>


// Create
var z=x.s;i.b=n;n.innerText=z(i.a);

// Update
i.a===j.a&&j.b.firstChild.data=i.a==null?'':i.a;
i.a===j.a&&j.b.firstChild.data=z(i.a);

// Not first child
<div>
  <span />
  {textual}
</div>

// Create
var t=x.t;i.b=n.appendChild(t(i.a));

// Update
var s=x.s;i.a===j.a&&j.b.data=s(i.a);
```

## Code Generation API Update: create/update array/JSX

JSXSpreadChildren has just been merged https://github.com/babel/babel/pull/4988
There is now a way for user's to express what a dynamic child element is.
xvdom users will use this to indicate whether a child is text or JSX/array.
This should greatly simplify and improve the performance of the majority case: dynamic text.


```jsx
// Only child
<div>{textual}</div>

// Create (same as firstChild optimization)
var s=x.s;i.b=n;n.innerText=s(i.a);

// Not only / Not first child
<div>
  <span />
  {textual}
</div>

var t=x.t;i.b=n.appendChild(t(i.a));

```

```jsx
<div>{...jsxOrArray}</div>

// Create
inst.b = _n; xvdomCreateDynamicOnlyChild(_n, inst.a);

// Update
inst.a === pInst.a && xvdomCreateDynamicOnlyChild(pInst.b, inst.a, pInst.a);
```

```jsx
<div>{...jsxOrArray}</div>

// Create
inst.b = _n; xvdomCreateDynamicOnlyChild(_n, inst.a);

// Update
inst.a === pInst.a && xvdomCreateDynamicOnlyChild(pInst.b, inst.a, pInst.a);
```


```jsx
<div>
  <span />
  {...jsxOrArray}
</div>

// Create
inst.b = xvdomCreateDynamic(_n, inst.a);

// Update
inst.a === pInst.a && xvdomCreateDynamic(pInst.b, inst.a, pInst.a);
```

## Code generation: type the code code generation context (see generateSpecCreateCode()'s context)

Currently it's a POJO and left to the user's to manipulate and uphold contstraints.
Now that we know how these context properties are being manipulated (and the intent),
lets build intent oriented manipulation methods.

  - `instanceParamId` and `prevInstanceParamId`
    - Problems
      - We have to guess upfront with odd heuristics (does the fragment contain any custom elements?)
        to determine whether we need the instance or previous instance params
      - Code generation should dictate the need based on request
    - Solution
      - `context.getInstanceId`
      - `context.getPrevInstanceId`
  - `xvdomApi`

