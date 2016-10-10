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

function hasSideEffects(dyn){
  return dyn && (
    (dyn.componentName === 'input' && dyn.prop === 'value') ||
    (dyn.componentName === 'a'     && dyn.prop === 'href')
  )
}

const _globalsForFile = new Map();
const globals = {
  get: (file, name)=> {
    const prefixedName = `xvdom${name[0].toUpperCase()}${name.slice(1)}`;
    const fileGlobals = _globalsForFile.get(file)
                          || _globalsForFile.set(file, {}).get(file);
    return fileGlobals[name]
            || (fileGlobals[name] = file.scope.generateUidIdentifier(prefixedName));
  },
  forFile: (file)=> _globalsForFile.get(file)
};

function isComponentName(name){ return name && /^[A-Z]/.test(name); }

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
    Object.keys(keyValues).map((key)=>
      t.objectProperty(t.identifier(key), keyValues[key])
    )
  );
}

function transformProp(t, prop){
  return (
      t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression)
    : t.isJSXEmptyExpression(prop)     ? null
    : (t.isIdentifier(prop)
        || t.isMemberExpression(prop)) ? toReference(t, prop)
    : prop == null                     ? t.booleanLiteral(true)
    : prop
  );
}

const instParamId     = (t)=> t.identifier('inst');
const prevInstParamId = (t)=> t.identifier('pInst');
const tmpVarId        = (t, num)=> t.identifier(`_n${num ? ++num : ''}`);

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
    ...props.map((p)=> (
      t.expressionStatement(
        t.assignmentExpression('=',
          t.memberExpression(nodeVarId, p.nameId),
          p.isDynamic ? t.memberExpression(instId, p.dynamic.instanceValueId) : p.valueNode
        )
      )
    ))
  );
}

function generateSpecElementDynamicChildCode({t, xvdomApi, statements, instId}, parentNodeVarId, childDesc){
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

function generateSpecCreateElementCode(context, el, depth=0){
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
  el.children.forEach((childDesc)=> {
    switch(childDesc.type){
    case 'el':
      return generateSpecCreateElementCode(context, childDesc, depth);

    case 'dynamicChild':
      return generateSpecElementDynamicChildCode(context, tmpVar, childDesc);

    default:
      throw 'NOT IMPLEMENTED';
    }
  });
}

function generateSpecCreateCode(t, xvdomApi, {rootElement, dynamics}){
  const context = {
    t,
    xvdomApi,
    instId: instParamId(t),
    tmpVars: [],
    statements: []
  };

  generateSpecCreateElementCode(context, rootElement);

  const params = dynamics.length ? [instParamId(t)] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([
    t.variableDeclaration('var', context.tmpVars),
    ...context.statements,
    t.returnStatement(context.tmpVars[0].id)
  ]));
}

//TODO: function generateSpecUpdateDynamicPropCode(){}
//TODO: function generateSpecUpdateDynamicChildCode(){}

function generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, tmpVar, dynamic){
  const {type, instanceContextId, instanceValueId, name, isOnlyChild} = dynamic;
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
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(t.memberExpression(pInstId, instanceContextId), name),
              t.assignmentExpression('=',
                t.memberExpression(pInstId, instanceValueId),
                tmpVar
              )
            )
          )
        ])
      )
    ]
  }
  else{
    return [
      t.ifStatement(
        t.binaryExpression('!==',
          t.memberExpression(instId, instanceContextId),
          t.memberExpression(pInstId, instanceContextId)
        ),
        t.blockStatement([
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(pInstId, instanceValueId),
              t.callExpression(
                xvdomApi.accessFunction('updateDynamic'),
                [
                  t.booleanLiteral(isOnlyChild),
                  t.memberExpression(pInstId, instanceContextId),
                  t.assignmentExpression('=',
                    t.memberExpression(pInstId, instanceContextId),
                    t.memberExpression(instId, instanceContextId)
                  ),
                  t.memberExpression(pInstId, instanceValueId)
                ]
              )
            )
          )
        ])
      )
    ];
  }
}

function generateSpecUpdateCode(t, xvdomApi, {dynamics}){
  const instId = instParamId(t);
  const pInstId = prevInstParamId(t);
  const tmpVar = t.identifier('v');
  const params = dynamics.length ? [instId, pInstId] : EMPTY_ARRAY;
  const statements = !dynamics.length ? [] : [
    t.variableDeclaration('var', [t.variableDeclarator(tmpVar)]),
    ...dynamics.reduce((acc, dynamic)=> {
      acc.push(...generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, tmpVar, dynamic));
      return acc;
    }, [])
  ];

  return t.functionExpression(null, params, t.blockStatement(statements));
}

function generateInstanceCode(t, xvdomApi, {dynamics, id}){
  return obj(t,
    dynamics.reduce((acc, dynamic)=> {
      acc[dynamic.instanceValueId.name] = dynamic.value;
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
  return nodeAttributes.map((attr)=> {
    // TODO: rename transformProp to normalizeElementPropValue
    const valueNode  = transformProp(t, attr.value);
    // TODO: try just using attr.name without wrapping t.identifier()
    const nameId     = t.identifier(attr.name.name);
    const isDynamic  = isDynamicNode(t, valueNode);

    return {
      dynamic: isDynamic && context.addDynamicProp(node, nameId, valueNode),
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
    type: 'dynamicChild',
    dynamic: isDynamic && context.addDynamicChild(el, childNode, isOnlyChild),
    node: childNode
  };
}

/*
type Element {
  props: ElementProp[],
  children: (Element|ElementChild)[]
}
*/
function parseElement({t, file, context}, node)/*:Element*/{
  const { openingElement } = node;
  const children = buildChildren(t, node.children);
  const hasOnlyOneChild = children.length === 1;
  const el = { type: 'el', tag: openingElement.name.name };
  el.props    = parseElementProps(context, el, node.openingElement.attributes);
  el.children = children.map((child)=>
                  t.isJSXElement(child)
                    ? parseElement(context, child)
                    : parseElementChild(context, el, child, hasOnlyOneChild)
                );
  return el;
}

class ParsingContext{
  constructor(t, file){
    this.t = t;
    this.file = file;
    this.dynamics = [];
    this._instanceParamIndex = 0;
    this.context = this;
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

  addDynamicProp(el, name, value)/*:{type:String, name:String, value:Node, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    return this._addDynamic({
      type:             'prop',
      name,
      value,
      instanceContextId: this._getInstanceContextIdForNode(el),
      instanceValueId:   this._generateInstanceParamId()
    });
  }

  _addDynamic(dynamic){
    this.dynamics.push(dynamic);
    return dynamic;
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
    id:          file.scope.generateUidIdentifier('xvdomSpec'),
    rootElement: parseElement(context, node),
    dynamics:    context.dynamics
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
                Object.keys(fileGlobals).sort().map((key)=>
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
              accessFunction: (funcName)=> globals.get(file, funcName)
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
