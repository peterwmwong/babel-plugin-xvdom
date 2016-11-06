// TODO: Document why this didn't work (jsperf): crazy idea, chunks of completely static JSX are... innerHTML-ed in create.  :boom:
const {
  buildChildren,
  toReference
} = require('./helpers.js');

const genId = require('./genId.js');

const NODE_EL        = 'el';
const NODE_COMPONENT = 'component';
const NODE_STATIC    = 'staticChild';
const NODE_DYNAMIC   = 'dynamicChild';

const PROP_COMPONENT = 'componentProp';
const PROP_EL        = 'elProp';

const EMPTY_ARRAY    = [];

const isKeyAttribute          = attr => attr.name.name === 'key';
const isComponentName         = name => name && /^[A-Z]/.test(name);
const nonComponentPropDynamic = dyn  => dyn.type !== PROP_COMPONENT;

const hasSideEffects = (tag, propName) => (
  (tag === 'input' && propName === 'value') ||
  (tag === 'a'     && propName === 'href')
);

const _globalsForFile = new Map();
const globals = {
  get: (file, name) => {
    const prefixedName = `xvdom${name[0].toUpperCase()}${name.slice(1)}`;
    const fileGlobals = _globalsForFile.get(file)
                          || _globalsForFile.set(file, {}).get(file);
    return fileGlobals[name]
            || (fileGlobals[name] = file.scope.generateUidIdentifier(prefixedName));
  },
  forFile: file => _globalsForFile.get(file)
};

function isDynamicNode(t, astNode){
  if(t.isLiteral(astNode)){
    return false;
  }

  if(t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)){
    return isDynamicNode(t, astNode.left) || isDynamicNode(t, astNode.right);
  }

  if(t.isUnaryExpression(astNode)){
    return isDynamicNode(t, astNode.argument);
  }

  return true;
}

function obj(t, keyValues){
  return t.objectExpression(
    Object.keys(keyValues).map(key => {
      const value = keyValues[key];
      return (
        t.isFunctionExpression(value)
          ? t.objectMethod('method', t.identifier(key), value.params, value.body)
          : t.objectProperty(t.identifier(key), value)
      )
    })
  );
}

function normalizeElementPropValue(t, prop){
  return (
      t.isJSXExpressionContainer(prop) ? normalizeElementPropValue(t, prop.expression)
    : t.isJSXEmptyExpression(prop)     ? null
    : (t.isIdentifier(prop)
        || t.isMemberExpression(prop)) ? toReference(t, prop)
    : prop == null                     ? t.booleanLiteral(true)
    : prop
  );
}

const instParamId     = t => t.identifier('inst');
const prevInstParamId = t => t.identifier('pInst');
const tmpVarId        = (t, num) => t.identifier(`_n${num ? ++num : ''}`);

function generateAssignPropsCode({ t, instId, statements }, nodeVarId, { props, instanceContextId }){
  if(instanceContextId){
    statements.push(
      t.expressionStatement(
        t.assignmentExpression('=',
          t.memberExpression(instId, instanceContextId),
          nodeVarId
        )
      )
    )
  }

  statements.push(
    ...props.map(({ isDynamic, dynamic, nameId, valueNode }) => {
      const valueCode = isDynamic ? t.memberExpression(instId, dynamic.instanceValueId) : valueNode;

      if(dynamic.hasSideEffects){
        return t.ifStatement(
          t.binaryExpression(
            '!=',
            valueCode,
            t.nullLiteral()
          ),
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(nodeVarId, nameId),
              valueCode
            )
          )
        )
      }
      else {
        return t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(nodeVarId, nameId),
            valueCode
          )
        );
      }
    })
  );
}

function generateSpecElementDynamicChildCode({ t, xvdomApi, statements, instId }, childDesc, parentNodeVarId){
  const { dynamic: { instanceContextId, instanceValueId }, isOnlyChild } = childDesc;
  statements.push(
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(parentNodeVarId, t.identifier('appendChild')),
        [
          t.assignmentExpression('=',
            t.memberExpression(instId, instanceContextId),
            t.callExpression(
              xvdomApi.accessFunction('createDynamic'),
              [
                t.booleanLiteral(isOnlyChild),
                parentNodeVarId,
                t.memberExpression(instId, instanceValueId)
              ]
            )
          )
        ]
      )
    )
  );
}

function generateSpecElementStaticChildCode({ t, xvdomApi, statements, instId }, { node, isOnlyChild }, parentNodeVarId){
  statements.push(
    t.expressionStatement(
      // Optimization: https://jsperf.com/textcontent-vs-createtextnode-vs-innertext
      isOnlyChild
        ? (// _n.textContent = "hello" + 5;
            t.assignmentExpression('=',
              t.memberExpression(parentNodeVarId, t.identifier('textContent')),
              node
            )
          )
        : (// _n.appendChild(document.createTextNode(("hello" + 5) || ""));
            t.callExpression(
              t.memberExpression(parentNodeVarId, t.identifier('appendChild')),
              [
                t.callExpression(
                  t.memberExpression(t.identifier('document'), t.identifier('createTextNode')),
                  [node]
                )
              ]
            )
          )
    )
  );
}

function generateSpecCreateComponentCode(context, el, depth){
  const { t, instId, xvdomApi, tmpVars, statements } = context;
  const componentId = t.identifier(el.tag);
  const propsArg = !el.props.length
    ? t.nullLiteral()
    : obj(
        t,
        el.props.reduce(
          ((acc, { nameId, valueNode, dynamic }) => (
            acc[nameId.name] = dynamic ? t.memberExpression(instId, dynamic.instanceValueId) : valueNode,
            acc
          )),
          {}
        )
      );

  // Create element
  // ex. _xvdomCreateComponent('div');
  let createComponentCode = (
    t.callExpression(
      xvdomApi.accessFunction('createComponent'),
      [
        componentId,
        t.memberExpression(componentId, t.identifier('state')),
        propsArg,
        instId
      ]
    )
  );
  if(el.hasDynamicProps){
    createComponentCode = t.assignmentExpression('=',
      t.memberExpression(instId, el.instanceContextId),
      createComponentCode
    )
  }

  const createCode = t.memberExpression(createComponentCode, t.identifier('$n'))

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  if(tmpVars[depth]){
    // ...Otherwise assign it to the temp variable.
    statements.push(
      t.expressionStatement(
        t.assignmentExpression('=',
        tmpVars[depth],
        createCode
      )
    )
  );
  }
  else{
    tmpVars[depth] = t.variableDeclarator(tmpVarId(t, depth), createCode);
  }

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if(depth){
    statements.push(
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(tmpVars[depth-1].id, t.identifier('appendChild')),
          [tmpVars[depth].id]
        )
      )
    );
  }
}

function generateSpecCreateHTMLElementCode(context, el, depth){
  const { t, xvdomApi, tmpVars, statements } = context;

  // Create element
  // ex. _xvdomEl('div');
  const createCode = t.callExpression(
    xvdomApi.accessFunction('el'),
    [t.stringLiteral(el.tag)]
  );

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  let tmpVar = tmpVars[depth] ? tmpVars[depth].id : tmpVarId(t, depth);
  if(!tmpVars[depth]){
    tmpVars[depth] = t.variableDeclarator(tmpVar, createCode);
  }
  else{
    // ...Otherwise assign it to the temp variable.
    statements.push(
      t.expressionStatement(
        t.assignmentExpression('=',
          tmpVar,
          createCode
        )
      )
    );
  }

  // Assign props
  generateAssignPropsCode(context, tmpVars[depth].id, el);

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if(depth){
    statements.push(
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(tmpVars[depth-1].id, t.identifier('appendChild')),
          [tmpVars[depth].id]
        )
      )
    );
  }

  ++depth;

  el.children.forEach(childDesc => {
    switch(childDesc.type){
    case NODE_COMPONENT: return generateSpecCreateComponentCode(context, childDesc, depth);
    case NODE_EL:        return generateSpecCreateHTMLElementCode(context, childDesc, depth);
    case NODE_DYNAMIC:   return generateSpecElementDynamicChildCode(context, childDesc, tmpVar);
    case NODE_STATIC:    return generateSpecElementStaticChildCode(context, childDesc, tmpVar);
    }
  });
}

function generateSpecCreateElementCode(context, el){
  return el.type === 'el'
    ? generateSpecCreateHTMLElementCode(context, el, 0)
    : generateSpecCreateComponentCode(context, el, 0);
}

function generateSpecCreateCode(t, xvdomApi, { rootElement, dynamics, hasComponents }){
  const context = {
    t,
    xvdomApi,
    instId: instParamId(t),
    tmpVars: [],
    statements: []
  };

  generateSpecCreateElementCode(context, rootElement);

  const params = (hasComponents || dynamics.length) ? [instParamId(t)] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([
    t.variableDeclaration('var', context.tmpVars),
    ...context.statements,
    t.returnStatement(context.tmpVars[0].id)
  ]));
}

//TODO: function generateSpecUpdateDynamicPropCode(){}
//TODO: function generateSpecUpdateDynamicChildCode(){}

function generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, getTmpVar, dynamic){
  const { type, instanceContextId, instanceValueId, name, isOnlyChild, hasSideEffects } = dynamic;
  if(type === PROP_EL){
    const tmpVar = getTmpVar();
    return [
      t.expressionStatement(
        t.assignmentExpression('=',
          tmpVar,
          t.memberExpression(instId, instanceValueId)
        )
      ),
      t.ifStatement(
        t.binaryExpression('!==',
          tmpVar,
          t.memberExpression(pInstId, instanceValueId)
        ),
        hasSideEffects ? t.blockStatement([
          t.ifStatement(
            t.binaryExpression('!==',
              t.memberExpression(t.memberExpression(pInstId, instanceContextId), name),
              tmpVar
            ),
            t.expressionStatement(
              t.assignmentExpression('=',
                t.memberExpression(t.memberExpression(pInstId, instanceContextId), name),
                tmpVar
              )
            )
          ),
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(pInstId, instanceValueId),
              tmpVar
            )
          )
        ]) : t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(t.memberExpression(pInstId, instanceContextId), name),
            t.assignmentExpression('=',
              t.memberExpression(pInstId, instanceValueId),
              tmpVar
            )
          )
        )
      )
    ]
  }
  else{
    return [
      t.ifStatement(
        t.binaryExpression('!==',
          t.memberExpression(instId, instanceValueId),
          t.memberExpression(pInstId, instanceValueId)
        ),
        t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(pInstId, instanceContextId),
            t.callExpression(
              xvdomApi.accessFunction('updateDynamic'),
              [
                t.booleanLiteral(isOnlyChild),
                t.memberExpression(pInstId, instanceValueId),
                t.assignmentExpression('=',
                  t.memberExpression(pInstId, instanceValueId),
                  t.memberExpression(instId, instanceValueId)
                ),
                t.memberExpression(pInstId, instanceContextId)
              ]
            )
          )
        )
      )
    ];
  }
}

function generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component){
  const dynamicProps = component.props.filter(p => p.dynamic);
  const condition = (
    dynamicProps.map(p => (
      t.binaryExpression(
        '!==',
        t.memberExpression(instId, p.dynamic.instanceValueId),
        t.memberExpression(pInstId, p.dynamic.instanceValueId)
      )
    )).reduce(((expra, exprb) =>
      t.logicalExpression(
        '||',
        expra,
        exprb
      )
    ))
  );
  return (
    t.ifStatement(
      condition,
      t.expressionStatement(
        t.assignmentExpression('=',
          t.memberExpression(pInstId, component.instanceContextId),
          t.callExpression(
            xvdomApi.accessFunction('updateComponent'),
            [
              t.identifier(component.tag),
              t.memberExpression(
                t.identifier(component.tag),
                t.identifier('state')
              ),
              obj(t, component.props.reduce((hash, p) => {
                hash[p.nameId.name] = (
                  !p.dynamic ? p.valueNode : (
                    t.assignmentExpression('=',
                      t.memberExpression(pInstId, p.dynamic.instanceValueId),
                      t.memberExpression(instId, p.dynamic.instanceValueId)
                    )
                  )
                );
                return hash;
              }, {})),
              t.memberExpression(pInstId, component.instanceContextId)
            ]
          )
        )
      )
    )
  );
}

function generateSpecUpdateCode(t, xvdomApi, { dynamics, componentsWithDyanmicProps }){
  if(!dynamics.length) return t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY));

  const instId  = instParamId(t);
  const pInstId = prevInstParamId(t);
  let tmpVar;
  const getTmpVar = () => tmpVar || (tmpVar = t.identifier('v'));

  const updateDynamicPropCode = (
    dynamics
      .filter(nonComponentPropDynamic)
      .reduce((acc, dynamic) => {
        acc.push(...generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, getTmpVar, dynamic));
        return acc;
      }, [])
  );

  const updateDynamicComponents = (
    componentsWithDyanmicProps
      .map(component =>
        generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component)
      )
  );

  return (
    t.functionExpression(
      null,
      [instId, pInstId],
      t.blockStatement([
        ...(!tmpVar ? [] : [t.variableDeclaration('var', [t.variableDeclarator(tmpVar)])]),
        ...updateDynamicPropCode,
        ...updateDynamicComponents
      ])
    )
  );
}

function generateInstanceCode(t, xvdomApi, { dynamics, id, key }){
  return obj(t,
    dynamics.reduce(
      (acc, { instanceValueId, value }) => {
        acc[instanceValueId.name] = value;
        return acc;
      },
      Object.assign({ $s: id }, key && { key })
    )
  )
}

function generateRenderingCode(t, file, template){
  const xvdomApi = {
    accessFunction: apiFunc => globals.get(file, apiFunc)
  };
  return {
    specCode: obj(t, {
      c: generateSpecCreateCode(t, xvdomApi, template),
      u: generateSpecUpdateCode(t, xvdomApi, template),
      r: t.memberExpression(t.identifier('xvdom'), t.identifier('DEADPOOL'))
    }),
    instanceCode: generateInstanceCode(t, xvdomApi, template)
  }
}

function declareGlobal(t, file, id, value){
  file.path.unshiftContainer('body',
    t.variableDeclaration('var', [
      t.variableDeclarator(id, value)
    ])
  );
}

/*
type ElementProp {
  isDynamic: boolean,
  nameId: Identifier,
  valueNode: Node
}
*/
function parseElementProps({ t, file, context }, node, nodeAttributes)/*:ElementProp[]*/{
  return nodeAttributes.reduce((props, attr) => {
    if(!isKeyAttribute(attr)){
      const valueNode  = normalizeElementPropValue(t, attr.value);
      const name       = attr.name.name;
      const nameId     = t.identifier(name);
      const isDynamic  = isDynamicNode(t, valueNode);

      props.push({
        dynamic: isDynamic && context.addDynamicProp(node, nameId, valueNode, hasSideEffects(node.tag, name)),
        isDynamic,
        nameId,
        valueNode
      });
    }
    return props;
  }, []);
}

/*
type ElementChild {
  isDynamic: boolean,
  node: Node
}
*/
function parseElementChild({ t, file, context }, el, childNode, isOnlyChild)/*:ElementChild*/{
  const isDynamic = isDynamicNode(t, childNode);
  return {
    type:    isDynamic ? NODE_DYNAMIC : NODE_STATIC,
    dynamic: isDynamic && context.addDynamicChild(el, childNode, isOnlyChild),
    node:    childNode,
    isOnlyChild
  };
}

/*
type Element {
  props: ElementProp[],
  children: (Element|ElementChild)[]
}
*/
function parseElement({ t, file, context }, { openingElement: { name, attributes }, children })/*:Element*/{
  const isComponent      = isComponentName(name.name);
  const filteredChildren = buildChildren(t, children);
  const hasOnlyOneChild  = filteredChildren.length === 1;
  const el = {
    type: isComponent ? NODE_COMPONENT : NODE_EL,
    tag:  name.name
  };
  el.props    = parseElementProps(context, el, attributes);
  el.children = isComponent
    ? EMPTY_ARRAY
    : filteredChildren.map(child =>
        t.isJSXElement(child)
          ? parseElement(context, child)
          : parseElementChild(context, el, child, hasOnlyOneChild)
      );
  el.hasDynamicProps = el.props.some(p => p.dynamic);

  if(isComponent) context.hasComponents = true;
  return el;
}

class ParsingContext{
  constructor(t, file){
    this.t = t;
    this.file = file;
    this.dynamics = [];
    this.componentsWithDyanmicProps = new Set();
    this._instanceParamIndex = 0;
    this.context = this;
    this.hasComponents = false;
  }

  addDynamicChild(parentEl, childNode, isOnlyChild)/*:{type:String, value:Node, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    return this._addDynamic({
      type:             'child',
      value:             childNode,
      instanceContextId: this._generateInstanceParamId(),
      instanceValueId:   this._generateInstanceParamId(),
      isOnlyChild
    });
  }

  addDynamicProp(el, name, value, hasSideEffects)/*:{type:String, name:String, value:Node, hasSideEffects:Boolean, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    const isElementProp = el.type === NODE_EL;
    const dynamic = {
      type: (isElementProp ? PROP_EL : PROP_COMPONENT),
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

  _addDynamic(dynamic){
    this.dynamics.push(dynamic);
    return dynamic;
  }

  _addDynamicPropForComponent(component, dynamic){
    this.componentsWithDyanmicProps.add(component);
    return this._addDynamic(dynamic);
  }

  _getInstanceContextIdForNode(el){
    if(!el.instanceContextId) el.instanceContextId = this._generateInstanceParamId();
    return el.instanceContextId;
  }

  _generateInstanceParamId(){
    return this.t.identifier(genId(this._instanceParamIndex++));
  }
}

function parseElementKeyProp(t, { attributes }){
  const keyAttr = attributes.find(isKeyAttribute);
  if(keyAttr) return normalizeElementPropValue(t, keyAttr.value);
}

function parseTemplate(t, file, node)/*:{id:Identifier, root:Element}*/{
  const context = new ParsingContext(t, file);
  return {
    id:                         file.scope.generateUidIdentifier('xvdomSpec'),
    key:                        parseElementKeyProp(t, node.openingElement),
    rootElement:                parseElement(context, node),
    dynamics:                   context.dynamics,
    componentsWithDyanmicProps: Array.from(context.componentsWithDyanmicProps.keys()),
    hasComponents:              context.hasComponents
  };
}

module.exports = ({ types: t }) => ({
  visitor: {
    JSXElement: {
      exit(path, { file }){
        if(t.isJSX(path.parent)) return;

        const template = parseTemplate(t, file, path.node);
        const { specCode, instanceCode } = generateRenderingCode(t, file, template);

        path.replaceWith(instanceCode);
        declareGlobal(t, file, template.id, specCode);
      }
    },
    Program: {
      exit(path, { file }){
        const fileGlobals = globals.forFile(file);
        if(fileGlobals && Object.keys(fileGlobals).length){
          file.path.unshiftContainer('body',
            t.variableDeclaration('var',
              Object.keys(fileGlobals).sort().map(key =>
                t.variableDeclarator(
                  fileGlobals[key],
                  t.memberExpression(t.identifier('xvdom'), t.identifier(key))
                )
              )
            )
          );
        }
      }
    }
  }
});
