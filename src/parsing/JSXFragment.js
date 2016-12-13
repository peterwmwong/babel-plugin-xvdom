const genId = require('../genId.js');
const {
  buildChildren,
  toReference
} = require('../helpers.js');

const isAttr               = (attr, name) => attr.name.name === name
const isCloneableAttribute = attr => isAttr(attr, 'cloneable');
const isKeyAttribute       = attr => isAttr(attr, 'key');
const isNotXvdomAttribute  = attr => !isCloneableAttribute(attr) && !isKeyAttribute(attr);
const isComponentName      = name => /^[A-Z]/.test(name);

function isDynamicNode(t, astNode) {
  if(t.isLiteral(astNode)) {
    return false;
  }

  if(t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)) {
    return isDynamicNode(t, astNode.left) || isDynamicNode(t, astNode.right);
  }

  if(t.isUnaryExpression(astNode)) {
    return isDynamicNode(t, astNode.argument);
  }

  return true;
}

function normalizeElementPropValue(t, prop) {
  return (
      t.isJSXExpressionContainer(prop) ? normalizeElementPropValue(t, prop.expression)
    : t.isJSXEmptyExpression(prop)     ? null
    : (t.isIdentifier(prop)
        || t.isMemberExpression(prop)) ? toReference(t, prop)
    : prop == null                     ? t.booleanLiteral(true)
    : prop
  );
}

const hasSideEffects = (tag, propName) => (
  (tag === 'input' && propName === 'value') ||
  (tag === 'a'     && propName === 'href')
);

class JSXComponentProp {
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

class JSXComponentChild {
  constructor(parent) { this.parent = parent; }

  get depth()           { return !this.parent ? 0 : this.parent.depth + 1; }
  get index()           { return !this.parent ? 0 : this.parent.children.indexOf(this); }
  get distFromEnd()     { return !this.parent ? 0 : this.parent.children.length - this.index - 1; }
  get firstChild()      { return this.children[0]; }
  get lastChild()       { return this.children[this.children.length - 1]; }
  get nextSibling()     { return this.parent.children[this.index + 1]; }
  get previousSibling() { return this.parent.children[this.index - 1]; }
}

class JSXElementValueChild extends JSXComponentChild {
  constructor(fragment, astNode, parent, isOnlyChild) {
    super(parent);

    this.numContainedDynamics = 1;
    this.isOnlyChild = isOnlyChild;
    this.dynamic = isDynamicNode(fragment.t, astNode) && fragment.addDynamicChild(this);
    this.astValueNode = astNode;
  }
}

class JSXComponent extends JSXComponentChild {
  constructor(fragment, astJSXElement, parent) {
    super(parent);
    
    const { openingElement } = astJSXElement;

    this.tag = openingElement.name.name;
    this.props = (
      openingElement.attributes
        .filter(isNotXvdomAttribute)
        .map(attr => new JSXComponentProp(fragment, astJSXElement, attr, this))
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

class JSXHTMLComponent extends JSXComponent {
  constructor(fragment, astJSXElement, parent) {
    super(fragment, astJSXElement, parent);
    
    const { t } = fragment;
    const { children } = astJSXElement;
    const filteredChildren = buildChildren(t, children);
    const hasOnlyOneChild  = filteredChildren.length === 1;

    this.children = (
      filteredChildren.map(child =>
        t.isJSXElement(child)
          ? createComponent(fragment, child, this)
          : new JSXElementValueChild(fragment, child, this, hasOnlyOneChild)
      )
    );
  }
}

const createComponent = (fragment, astJSXElement, parent) => (
  !isComponentName(astJSXElement.openingElement.name.name)
    ? new JSXHTMLComponent(fragment, astJSXElement, parent)
    : (
      fragment.hasComponents = true,
      new JSXComponent(fragment, astJSXElement, parent)
    )
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
    this.componentsWithDyanmicProps = new Set();
    this._instanceParamIndex = 0;
    // TODO: Remove when code generator can determine on it's own whether an
    //       instance variable is needed. 
    this.hasComponents = false;
    this.t = t;

    this.key = parseKeyAttr(t, openingElement);
    // TODO: rename to isCloneable
    this.cloneable = openingElement.attributes.some(isCloneableAttribute);
    this.rootElement = createComponent(this, astNode, null);
  }

  addDynamicChild(parent) {
    const dynamic = new DynamicChild(
      this._genInstancePropId(),
      this._genInstancePropId(),
      parent
    );
    return this._addDynamic(dynamic);
  }

  addDynamicProp(prop) {
    const dynamic = new DynamicProp(
      this._getInstanceContextIdForNode(prop.el),
      this._genInstancePropId(),
      prop
    );
    return (
      prop.el instanceof JSXHTMLComponent
        ? this._addDynamic(dynamic)
        : this._addDynamicPropForComponent(dynamic)
    )
  }

  _addDynamic(dynamic) {
    this.dynamics.push(dynamic);
    return dynamic;
  }

  _addDynamicPropForComponent(dynamic) {
    this.componentsWithDyanmicProps.add(dynamic.el);
    return this._addDynamic(dynamic);
  }

  _getInstanceContextIdForNode(el) {
    if(!el.instanceContextId) el.instanceContextId = this._genInstancePropId();
    return el.instanceContextId;
  }

  _genInstancePropId() {
    return this.t.identifier(genId(this._instanceParamIndex++));
  }
}

module.exports = {
  DynamicChild,
  DynamicProp,
  JSXFragment,
  JSXComponent,
  JSXHTMLComponent,
  JSXComponentProp,
  JSXComponentChild,
  JSXElementValueChild
}
