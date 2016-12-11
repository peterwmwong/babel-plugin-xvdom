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
  constructor(fragment, astNode, parent, depth, isOnlyChild, index) {
    const { t } = fragment;
    const isDynamic = isDynamicNode(t, astNode);
    this.index = index;
    this.depth = depth;
    this.isOnlyChild = isOnlyChild;
    this.distFromEnd = (parent.children && (parent.children.length - index - 1));
    // TODO: Remove and update user to use instanceof
    this.type = isDynamic ? NODE_DYNAMIC : NODE_STATIC,
    this.dynamic = isDynamic && fragment.addDynamicChild(parent, astNode, isOnlyChild),
    this.node = astNode;
  }
}

class JSXElementProp {
  constructor(fragment, astNode, attr, el) {
    const { t, context } = fragment;
    const name = attr.name.name;

    this.nameId    = t.identifier(name);
    this.valueNode = normalizeElementPropValue(t, attr.value);
    this.isDynamic = isDynamicNode(t, this.valueNode);

    // TODO: Consider removing addDynamicProp
    //       JSXFragment could determine this after the fact (recursive descent) 
    this.dynamic = (
      this.isDynamic &&
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

class JSXElement {
  constructor(fragment, astNode, parent, depth, index, distFromEnd) /*:Element*/ {
    const { t } = fragment;
    const { openingElement: { name, attributes }, children } = astNode;
    const isComponent      = isComponentName(name.name);
    const filteredChildren = buildChildren(t, children);
    const numChildren      = filteredChildren.length;
    const hasOnlyOneChild  = numChildren === 1;

    this.parent = parent;

    // TODO: make a getter
    this.index = index;

    // TODO: 1) Is this needed? How are we using this? 2) make a getter
    this.depth = depth;

    // TODO: make a getter
    this.distFromEnd = distFromEnd;

    // TODO: Remove and change users to do instanceof
    this.type = isComponent ? NODE_COMPONENT : NODE_EL;

    this.tag = name.name;
    this.props = (
      attributes
        .filter(isNotXvdomAttribute)
        .map(attr => new JSXElementProp(fragment, astNode, attr, this))
    );

    const childDepth = depth + 1;
    let numDynamicDescendants = 0;
    
    this.children = (
      isComponent
        ? EMPTY_ARRAY
        : filteredChildren.map((child, childIndex) => {
          let parsedChild;

          if(t.isJSXElement(child)) {
            parsedChild = new JSXElement(fragment, child, this, childDepth, childIndex, numChildren - childIndex - 1);
            if(parsedChild.hasDynamicProps) ++numDynamicDescendants;
            numDynamicDescendants += parsedChild.numDynamicDescendants;
          }
          else{
            parsedChild = new JSXElementChild(fragment, child, this, childDepth, hasOnlyOneChild, childIndex, numChildren - childIndex - 1);
            if(parsedChild.dynamic) ++numDynamicDescendants;
          }
          return parsedChild;
        })
    );

    // TODO: make a getter
    this.hasDynamicProps = this.props.some(p => p.dynamic);

    // TODO: make a getter. I believe this is only used for cloneables.
    //       Let's not tax non-cloneables (probably a majority case)
    this.numDynamicDescendants = numDynamicDescendants;

    // TODO: make a getter
    this.firstChild = this.children[0];

    // TODO: make a getter
    this.lastChild = this.children[this.children.length - 1];

    if(isComponent) fragment.hasComponents = true;
  }

  get nextSibling() {
    return this.parent.children[this.index + 1];
  }

  get previousSibling() {
    return this.parent.children[this.index - 1];
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
    this.componentsWithDyanmicPropsSet = new Set();
    this._instanceParamIndex = 0;
    this.context = this;
    this.hasComponents = false;
    this.t = t;

    this.key = parseKeyAttr(t, openingElement);
    // TODO: rename to isCloneable
    this.cloneable = openingElement.attributes.some(isCloneableAttribute);
    this.rootElement = new JSXElement(this, astNode, null, 0, 0, 0);
  }

  get componentsWithDyanmicProps() {
    return Array.from(this.componentsWithDyanmicPropsSet.keys()); 
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
    const isElementProp = el.type === NODE_EL;
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
    this.componentsWithDyanmicPropsSet.add(component);
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
  JSXElementChild
}
