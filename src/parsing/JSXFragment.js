const genId = require('../genId.js');
const {
  buildChildren,
  toReference
} = require('../helpers.js');

const NODE_EL        = 'el';
const NODE_COMPONENT = 'component';
const NODE_STATIC    = 'staticChild';
const NODE_DYNAMIC   = 'dynamicChild';

const PROP_COMPONENT = 'componentProp';
const PROP_EL        = 'elProp';

const EMPTY_ARRAY    = [];

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


class JSXElementChild {
  constructor(parent) {
    this.parent = parent;
  }

  get depth()           { return !this.parent ? 0 : this.parent.depth + 1; }
  get index()           { return !this.parent ? 0 : this.parent.children.indexOf(this); }
  get distFromEnd()     { return !this.parent ? 0 : this.parent.children.length - this.index - 1; }
  get firstChild()      { return this.children[0]; }
  get lastChild()       { return this.children[this.children.length - 1]; }
  get nextSibling()     { return this.parent.children[this.index + 1]; }
  get previousSibling() { return this.parent.children[this.index - 1]; }
}


class JSXElementValueChild extends JSXElementChild {
  constructor(fragment, astNode, parent, isOnlyChild) {
    super(parent);

    this.numContainedDynamics = 1;
    this.isOnlyChild = isOnlyChild;
    this.dynamic = isDynamicNode(fragment.t, astNode) && fragment.addDynamicChild(parent, astNode, isOnlyChild);
    this.valueNode = astNode;
  }
}

class JSXElementProp {
  constructor(fragment, astNode, attr, el) {
    const { t, context } = fragment;
    const name = attr.name.name;

    this.nameId    = t.identifier(name);
    this.valueNode = normalizeElementPropValue(t, attr.value);

    // TODO: Consider removing addDynamicProp
    //       JSXFragment could determine this after the fact (recursive descent) 
    this.dynamic = (
      isDynamicNode(t, this.valueNode) &&
      context.addDynamicProp(
        el,
        this,
        this.nameId,
        this.valueNode,
        hasSideEffects(astNode.tag, name)
      )
    );
  }

}

class JSXElement extends JSXElementChild {
  constructor(fragment, astNode, parent) {
    super(parent);
    
    const { t } = fragment;
    const { openingElement: { name, attributes }, children } = astNode;
    const isComponent      = isComponentName(name.name);
    const filteredChildren = buildChildren(t, children);
    const numChildren      = filteredChildren.length;
    const hasOnlyOneChild  = numChildren === 1;

    this.isComponent = isComponent;
    this.tag = name.name;

    this.props = (
      attributes
        .filter(isNotXvdomAttribute)
        .map(attr => new JSXElementProp(fragment, astNode, attr, this))
    );

    this.children = (
      isComponent
        ? EMPTY_ARRAY
        : filteredChildren.map(child =>
            t.isJSXElement(child)
              ? new JSXElement(fragment, child, this)
              : new JSXElementValueChild(fragment, child, this, hasOnlyOneChild)
          )
    );

    if(isComponent) fragment.hasComponents = true;
  }

  get numDynamicProps() {
    return this.props.reduce((total, prop) => +!!prop.dynamic + total, 0);
  }

  get hasDynamicProps() { return !!this.numDynamicProps; }

  get numContainedDynamics() {
    return +this.numDynamicProps + this.children.reduce((total, child) => child.numContainedDynamics + total, 0);
  }
}

const parseKeyAttr = (t, astJSXOpeningElement) => {
  const keyAttr = astJSXOpeningElement.attributes.find(isKeyAttribute);
  return keyAttr && normalizeElementPropValue(t, keyAttr.value);
}  

class JSXFragment {
  constructor(t, astNode) {
    const { openingElement } = astNode;

    this.dynamics = [];
    this.componentsWithDyanmicProps = new Set();
    this._instanceParamIndex = 0;
    this.context = this;
    this.hasComponents = false;
    this.t = t;

    this.key = parseKeyAttr(t, openingElement);
    // TODO: rename to isCloneable
    this.cloneable = openingElement.attributes.some(isCloneableAttribute);
    this.rootElement = new JSXElement(this, astNode);
  }

  addDynamicChild(parent, childNode, isOnlyChild) /*:{type:String, value:Node, instanceContextId:Identifier, instanceValueId:Identifier}*/ {
    return this._addDynamic({
      parent,
      type:              'child',
      value:             childNode,
      instanceContextId: this._generateInstanceParamId(),
      instanceValueId:   this._generateInstanceParamId(),
      isOnlyChild
    });
  }

  addDynamicProp(el, prop, name, value, hasSideEffects) /*:{type:String, name:String, value:Node, hasSideEffects:Boolean, instanceContextId:Identifier, instanceValueId:Identifier}*/ {
    const isElementProp = !el.isComponent;
    const dynamic = {
      type: (isElementProp ? PROP_EL : PROP_COMPONENT),
      el,
      prop,
      name,
      value,
      hasSideEffects,
      instanceContextId: this._getInstanceContextIdForNode(el),
      instanceValueId:   this._generateInstanceParamId()
    };
    return (
      isElementProp
        ? this._addDynamic(dynamic)
        : this._addDynamicPropForComponent(el, dynamic)
    )
  }

  _addDynamic(dynamic) {
    this.dynamics.push(dynamic);
    return dynamic;
  }

  _addDynamicPropForComponent(component, dynamic) {
    this.componentsWithDyanmicProps.add(component);
    return this._addDynamic(dynamic);
  }

  _getInstanceContextIdForNode(el) {
    if(!el.instanceContextId) el.instanceContextId = this._generateInstanceParamId();
    return el.instanceContextId;
  }

  _generateInstanceParamId() {
    return this.t.identifier(genId(this._instanceParamIndex++));
  }
}

module.exports = {
  JSXFragment,
  JSXElement,
  JSXElementProp,
  JSXElementChild,
  JSXElementValueChild
}
