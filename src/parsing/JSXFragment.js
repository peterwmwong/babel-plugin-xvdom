const genCompactId = require('./genCompactId');
const normalizeChildren = require('./normalizeChildren');
const normalizeElementPropValue = require('./normalizeElementPropValue');
const {
  isCloneableAttribute,
  isComponentName,
  isDynamicNode,
  isKeyAttribute,
  isNotXvdomAttribute
} = require('./isHelpers');

const hasSideEffects = (tag, propName) => (
  (tag === 'input' && propName === 'value') ||
  (tag === 'a'     && propName === 'href')
);

class JSXElementProp {
  constructor(fragment, astNode, attr, el) {
    const { t } = fragment;
    const name = attr.name.name;

    this.el = el; 
    this.astNameId = t.identifier(name);
    this.astValueNode = normalizeElementPropValue(t, attr.value);
    this.hasSideEffects = hasSideEffects(astNode.tag, name);

    this.dynamic = (
      isDynamicNode(t, this.astValueNode) &&
      fragment.addDynamicProp(this)
    );
  }
}

/*
Type Hierarchy

- JSXElementChild
  - JSXValueElement
  - JSXElement
    - JSXHTMLElement
*/

class JSXElementChild {
  constructor(parent) { this.parent = parent; }

  get depth()           { return !this.parent ? 0 : this.parent.depth + 1; }
  get index()           { return !this.parent ? 0 : this.parent.children.indexOf(this); }
  get distFromEnd()     { return !this.parent ? 0 : this.parent.children.length - this.index - 1; }
  get firstChild()      { return this.children[0]; }
  get lastChild()       { return this.children[this.children.length - 1]; }
  get nextSibling()     { return this.parent.children[this.index + 1]; }
  get previousSibling() { return this.parent.children[this.index - 1]; }

  relationshipTo(comp)  {
    return (
        this === comp.firstChild      ? 'firstChild'
      : this === comp.lastChild       ? 'lastChild'
      : this === comp.nextSibling     ? 'nextSibling'
      : this === comp.previousSibling ? 'previousSibling'
      : 'UNKNOWN'
    );
  }
}

class JSXValueElement extends JSXElementChild {
  constructor(fragment, astNode, parent, isOnlyChild) {
    super(parent);

    this.numContainedDynamics = 1;
    this.isOnlyChild = isOnlyChild;
    this.dynamic = isDynamicNode(fragment.t, astNode) && fragment.addDynamicChild(this);
    this.astValueNode = astNode;
  }
}

class JSXElement extends JSXElementChild {
  constructor(fragment, astJSXElement, parent) {
    super(parent);
    
    const { openingElement } = astJSXElement;

    this.tag = openingElement.name.name;
    this.props = (
      openingElement.attributes
        .filter(isNotXvdomAttribute)
        .map(attr => new JSXElementProp(fragment, astJSXElement, attr, this))
    );
  }

  get numDynamicProps() {
    return this.props.filter(p => p.dynamic).length;
  }

  get numContainedDynamics() {
    const numDynamicsFromChildren = this.children.reduce((total, child) => child.numContainedDynamics + total, 0);
    return this.numDynamicProps + numDynamicsFromChildren;
  }
}

class JSXHTMLElement extends JSXElement {
  constructor(fragment, astJSXElement, parent) {
    super(fragment, astJSXElement, parent);
    
    const { t } = fragment;
    const { children } = astJSXElement;
    const filteredChildren = normalizeChildren(t, children);
    const hasOnlyOneChild  = filteredChildren.length === 1;

    this.children = (
      filteredChildren.map(child =>
        t.isJSXElement(child)
          ? createJSXElement(fragment, child, this)
          : new JSXValueElement(fragment, child, this, hasOnlyOneChild)
      )
    );
  }
}

const createJSXElement = (fragment, astJSXElement, parent) => (
  !isComponentName(astJSXElement.openingElement.name.name)
    ? new JSXHTMLElement(fragment, astJSXElement, parent)
    : new JSXElement(fragment, astJSXElement, parent)
);

const parseKeyAttr = (t, astJSXOpeningElement) => {
  const keyAttr = astJSXOpeningElement.attributes.find(isKeyAttribute);
  return keyAttr && normalizeElementPropValue(t, keyAttr.value);
}  

class Dynamic {
  constructor(instanceContextId, instanceValueId) {
    this.instanceContextId = instanceContextId; 
    this.instanceValueId  = instanceValueId;
  }
}

class DynamicProp extends Dynamic {
  constructor(instanceContextId, instanceValueId, prop) {
    super(instanceContextId, instanceValueId);
    this.prop = prop;
  }

  get el() { return this.prop.el; }
  get hasSideEffects() { return this.prop.hasSideEffects; }
  get astNameId() { return this.prop.astNameId; }
  get astValueNode() { return this.prop.astValueNode; }
}

class DynamicChild extends Dynamic {
  constructor(instanceContextId, instanceValueId, child) {
    super(instanceContextId, instanceValueId);
    this.child = child;
  }

  get isOnlyChild() { return this.child.isOnlyChild; }
  get astValueNode() { return this.child.astValueNode; }
}

class JSXFragment {
  constructor(t, astNode) {
    const { openingElement } = astNode;

    this.dynamics = [];
    this.customElementsWithDynamicProps = new Set();
    this._instanceParamIndex = 0;
    this.t = t;
    this.key = parseKeyAttr(t, openingElement);
    this.isCloneable = openingElement.attributes.some(isCloneableAttribute);
    this.rootElement = createJSXElement(this, astNode, null);
  }

  get hasComponents() {
    const els = [ this.rootElement ];
    let el;
    while(el = els.pop()) {
      if(el instanceof JSXHTMLElement)  { els.push(...el.children); }
      else if(el instanceof JSXElement) { return true; }
    }
    return false;
  }

  addDynamicChild(parent) {
    const dynamic = new DynamicChild(
      this._genInstancePropId(),
      this._genInstancePropId(),
      parent
    );

    this.dynamics.push(dynamic);
    return dynamic;
  }

  addDynamicProp(prop) {
    const { el } = prop;
    const dynamic = new DynamicProp(
      this._getInstanceContextIdForNode(el),
      this._genInstancePropId(),
      prop
    );
    
    this.dynamics.push(dynamic);
    if(!(el instanceof JSXHTMLElement)) this.customElementsWithDynamicProps.add(el);
    return dynamic;
  }

  _getInstanceContextIdForNode(el) {
    if(!el.instanceContextId) el.instanceContextId = this._genInstancePropId();
    return el.instanceContextId;
  }

  _genInstancePropId() {
    return this.t.identifier(genCompactId(this._instanceParamIndex++));
  }
}

module.exports = {
  DynamicChild,
  DynamicProp,
  JSXFragment,
  JSXElement,
  JSXHTMLElement,
  JSXElementProp,
  JSXElementChild,
  JSXValueElement
}
