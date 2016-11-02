//TODO(design): conditionally including globals (createDynamic, createDynamic, createComponent)
//TODO(design): More specific xvdom AST node information (element, component, w/dynamic-props? etc.)
//                - There is waaayyyy to many arguments being passed between the create*Code functions
//                - Need an abstraction to group all relevant information necessary for the code generating functions
const {
  buildChildren,
  toReference
} = require('./helpers.js');

const genId = require('./genId.js');

const EMPTY_ARRAY = [];

const isComponentName = name => name && /^[A-Z]/.test(name);

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
    Object.keys(keyValues).map(key =>
      t.objectProperty(t.identifier(key), keyValues[key])
    )
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

function generateAssignPropsCode({t, instId, statements}, nodeVarId, {props, instanceContextId}){
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
    ...props.map(({isDynamic, dynamic, nameId, valueNode}) => {
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

function generateSpecElementDynamicChildCode({t, xvdomApi, statements, instId}, childDesc, parentNodeVarId){
  const { dynamic: { instanceContextId, instanceValueId, isOnlyChild } } = childDesc;
  statements.push(
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(parentNodeVarId, t.identifier('appendChild')),
        [t.assignmentExpression('=',
          t.memberExpression(instId, instanceContextId),
          t.callExpression(
            xvdomApi.accessFunction('createDynamic'),
            [
              t.booleanLiteral(isOnlyChild),
              parentNodeVarId,
              t.memberExpression(instId, instanceValueId)
            ]
          )
        )]
      )
    )
  );
}

function generateSpecElementStaticChildCode({t, xvdomApi, statements, instId}, { node }, parentNodeVarId){
  // _n.appendChild(document.createTextNode(("hello" + 5) || ""));
  statements.push(
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(parentNodeVarId, t.identifier('appendChild')),
        [
          t.callExpression(
            t.memberExpression(t.identifier('document'), t.identifier('createTextNode')),
            [
              t.logicalExpression('||',
                t.sequenceExpression([node]),
                t.stringLiteral('')
              )
            ]
          )
        ]
      )
    )
  );
}

function generateSpecCreateComponentCode(context, el, _, depth=0){
  const {t, instId, xvdomApi, tmpVars, statements} = context;
  const componentId = t.identifier(el.tag);
  const propsArg = !el.props.length
    ? t.nullLiteral()
    : obj(
        t,
        (el.props.reduce(((acc, {nameId, valueNode, dynamic}) => (
          acc[nameId.name] = dynamic ? t.memberExpression(instId, dynamic.instanceValueId) : valueNode,
          acc
        )), {}))
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

function generateSpecCreateHTMLElementCode(context, el, _, depth=0){
  const {t, xvdomApi, tmpVars, statements} = context;

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
    return CHILD_CODE_GENERATORS[childDesc.type](context, childDesc, tmpVar, depth);
  });
}

const CHILD_CODE_GENERATORS = {
  component:    generateSpecCreateComponentCode,
  el:           generateSpecCreateHTMLElementCode,
  dynamicChild: generateSpecElementDynamicChildCode,
  staticChild:  generateSpecElementStaticChildCode
};

function generateSpecCreateElementCode(context, el, depth=0){
  return el.type === 'el'
    ? generateSpecCreateHTMLElementCode(context, el, null, depth)
    : generateSpecCreateComponentCode(context, el, null, depth);
}

function generateSpecCreateCode(t, xvdomApi, {rootElement, dynamics, hasComponents}){
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

function generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, tmpVar, dynamic){
  const {type, instanceContextId, instanceValueId, name, isOnlyChild, hasSideEffects} = dynamic;
  if(type === 'prop'){
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

function generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, tmpVar, component){
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

function generateSpecUpdateCode(t, xvdomApi, {dynamics, componentsWithDyanmicProps}){
  const instId      = instParamId(t);
  const pInstId     = prevInstParamId(t);
  const tmpVar      = t.identifier('v');
  const hasDynamics = dynamics.length || componentsWithDyanmicProps.size;
  const nonComponentDynamics = dynamics.filter(d => d.type !== 'componentProp');
  const params      = hasDynamics ? [instId, pInstId] : EMPTY_ARRAY;
  const statements  = !hasDynamics ? [] : [
    t.variableDeclaration('var', [t.variableDeclarator(tmpVar)]),
    // TODO: why can't this be map?
    ...nonComponentDynamics.reduce((acc, dynamic) => {
      acc.push(...generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, tmpVar, dynamic));
      return acc;
    }, []),
    ...Array.from(componentsWithDyanmicProps.keys()).map(component =>
      generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, tmpVar, component)
    )
  ];

  return t.functionExpression(null, params, t.blockStatement(statements));
}

function generateInstanceCode(t, xvdomApi, {dynamics, id}){
  return obj(t,
    dynamics.reduce((acc, { instanceValueId, value }) => {
      acc[instanceValueId.name] = value;
      return acc;
    }, {$s: id})
  )
}

function generateRenderingCode(t, xvdomApi, template){
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
function parseElementProps({t, file, context}, node, nodeAttributes)/*:ElementProp[]*/{
  return nodeAttributes.map(attr => {
    const valueNode  = normalizeElementPropValue(t, attr.value);
    const name       = attr.name.name;
    const nameId     = t.identifier(name);
    const isDynamic  = isDynamicNode(t, valueNode);

    return {
      dynamic: isDynamic && context.addDynamicProp(node, nameId, valueNode, hasSideEffects(node.tag, name)),
      isDynamic,
      nameId,
      valueNode
    };
  });
}

/*
type ElementChild {
  isDynamic: boolean,
  node: Node
}
*/
function parseElementChild({t, file, context}, el, childNode, isOnlyChild)/*:ElementChild*/{
  const isDynamic = isDynamicNode(t, childNode);
  return {
    type:    isDynamic ? 'dynamicChild' : 'staticChild',
    dynamic: isDynamic && context.addDynamicChild(el, childNode, isOnlyChild),
    node:    childNode
  };
}

/*
type Element {
  props: ElementProp[],
  children: (Element|ElementChild)[]
}
*/
function parseElement({t, file, context}, { openingElement: { name, attributes }, children })/*:Element*/{
  const isComponent      = isComponentName(name.name);
  const filteredChildren = buildChildren(t, children);
  const hasOnlyOneChild  = filteredChildren.length === 1;
  const el = {
    type: isComponent ? 'component' : 'el',
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
    const isElementProp = el.type === 'el';
    const dynamic = {
      type: (isElementProp ? 'prop' : 'componentProp'),
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

function parseTemplate(t, file, node)/*:{id:Identifier, root:Element}*/{
  const context = new ParsingContext(t, file);
  return {
    id:                         file.scope.generateUidIdentifier('xvdomSpec'),
    rootElement:                parseElement(context, node),
    dynamics:                   context.dynamics,
    componentsWithDyanmicProps: context.componentsWithDyanmicProps,
    hasComponents:              context.hasComponents
  };
}

module.exports = function Plugin({types: t}){
  return {
    visitor: {
      Program: {
        exit(path, {file}){
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
      },

      JSXElement: {
        exit(path, {file}){
          const {node, parent} = path;
          if(!t.isJSX(parent)){
            const template = parseTemplate(t, file, node);
            const xvdomApi = {
              accessFunction: funcName => globals.get(file, funcName)
            };
            const {specCode, instanceCode} = generateRenderingCode(t, xvdomApi, template);

            path.replaceWith(instanceCode);
            declareGlobal(t, file, template.id, specCode);
          }
        }
      }
    }
  };
}
