## API update for dynamics

```jsx
xvdom.text = v => v != null ? v : '';
xvdom.createText = v => document.createTextNode(xvdom.text(v));
```

### Code Generation API Update: createDynamicText/updateDynamicText if firstChild

```jsx
// First child or Only child
<div>
  {textual}
  <span />
</div>


// - Create
i.b = n;
n.innerText=xvdomText(i.a);

// - Update
if(i.a===pInst.a){
  pInst.b.firstChild.data = xvdomText(pInst.a = inst.a);
}

// Not first child
<div>
  <span />
  {textual}
</div>

// - Create
i.b = n.appendChild(xvdomText(i.a));

// - Update
if(i.a===pInst.a){
  pInst.b.data = xvdomText(pInst.a = inst.a);
}
```

### Code Generation API Update: create/update array/JSX

JSXSpreadChildren has just been merged https://github.com/babel/babel/pull/4988
There is now a way for user's to express what a dynamic child element is.
xvdom users will use this to indicate whether a child is text or JSX/array.
This should greatly simplify and improve the performance of the majority case: dynamic text.


```jsx
<div>{...jsxOrArray}</div>

// Create
inst.b = xvdomCreateDynamicOnlyChild(_n, inst.a);

// Update
if(inst.a === pInst.a) {
  pInst.b = _xvdomUpdateDynamicOnlyChild(pInst.a, pInst.a = inst.a, pInst.b);
}

// Only Child
<div>
  {...jsxOrArray}
  <span></span>
</div>

// Create
inst.b = xvdomCreateDynamic(_n, inst.a);

// Update
if(inst.a === pInst.a) {
  pInst.b = _xvdomUpdateDynamic(pInst.a, pInst.a = inst.a, pInst.b);
}
```

## Unit/Integration specs for pathing algorithm


## Code Generation: Cloneable temporary variable recycling

Consider the output for cloneable-save-path-nodes:

```js
(inst.i = _n2 = _n.lastChild).id = inst.j;
(inst.e = _n4 = (_n3 = _n2.previousSibling.firstChild).nextSibling).id = inst.f;
(inst.g = _n4.nextSibling.firstChild).id = inst.h;
(inst.a = (_n5 = _n3.firstChild).firstChild.firstChild).id = inst.b;
(inst.c = _n5.lastChild.firstChild).id = inst.d;
```

`_n2`, `_n4`, `_n3` could be reused for another node after it's been used, since it is not referenced again after it's used.
An optimized output could reuse a variable once it's contents is no longer needed...

```js
(inst.i = _n2 = _n.lastChild).id = inst.j;
(inst.e = _n3 = (_n2 = _n2.previousSibling.firstChild).nextSibling).id = inst.f;
(inst.g = _n3.nextSibling.firstChild).id = inst.h;
(inst.a = (_n2 = _n2.firstChild).firstChild.firstChild).id = inst.b;
(inst.c = _n2.lastChild.firstChild).id = inst.d;
```

... the number of temp variables was reduced to 2 (`_n2` and `_n3`).
