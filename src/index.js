const {
  DynamicChild,
  DynamicProp,
  JSXElement,
  JSXHTMLElement,
  JSXValueElement,
  JSXFragment
} = require('./parsing/JSXFragment.js'); 

const {
  getPath
} = require('./pathing/index.js');

const {
  log,
} = require('./logger.js');

const EMPTY_ARRAY    = [];

const nonComponentPropDynamic = d          => !(d instanceof DynamicProp) || (d.el instanceof JSXHTMLElement);
const instParamId             = t          => t.identifier('inst');
const prevInstParamId         = t          => t.identifier('pInst');
const tmpVarId                = (t, num)   => t.identifier(`_n${num ? ++num : ''}`);
const xvdomApiFuncName        = name       => `xvdom${name[0].toUpperCase()}${name.slice(1)}`;

const _fileGlobalForFile = new WeakMap();
class FileGlobals {
  static forFile(t, file) {
    return (
      _fileGlobalForFile.get(file) ||
        _fileGlobalForFile
          .set(file, new FileGlobals(t, file))
          .get(file)
    );
  }

  constructor(t, file) {
    this._t = t;
    this._file = file;
    this._definedPrefixCounts = new Map();
    this._globals = {};
  }

  definePrefixed(name, value) {
    const { _definedPrefixCounts } = this;
    const count = 1 + (_definedPrefixCounts.get(name) | 0);
    const globalId = count === 1 ? name : name + count;

    _definedPrefixCounts.set(name, count);
    return this._globals[globalId] = {
      uniqueNameId: this._file.scope.generateUidIdentifier(name),
      value
    };
  }

  accessFunction(apiFuncName) {
    const { _t } = this;
    const globalId = xvdomApiFuncName(apiFuncName);
    const global = this._globals[globalId];
    return (
      global ||
        (this._globals[globalId] = {
          uniqueNameId: this._file.scope.generateUidIdentifier(globalId),
          value: _t.memberExpression(_t.identifier('xvdom'), _t.identifier(apiFuncName))
        })
    ).uniqueNameId;
  }

  get allGlobals() { return this._globals; }
}

function obj(t, keyValues) {
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

function generateAssignDynamicProp(
  { t, instId, statements },
  domNodeExpression,
  { dynamic, astValueNode, astNameId },
  expressionToAssignDomNode
) {
  const valueCode = (
    dynamic
      ? t.memberExpression(instId, dynamic.instanceValueId)
      : astValueNode
  );

  // Optimization: combine assigning to contextual node `inst.a` to the instance.
  if(expressionToAssignDomNode) {
    domNodeExpression = t.assignmentExpression('=',
      expressionToAssignDomNode,
      domNodeExpression
    );
  }

  const exprStmt = t.expressionStatement(
    t.assignmentExpression('=',
      t.memberExpression(domNodeExpression, astNameId),
      valueCode
    )
  );

  statements.push(
    !dynamic.hasSideEffects
      ? exprStmt
      : t.ifStatement(
          t.binaryExpression('!=', valueCode, t.nullLiteral()),
          exprStmt
        )
  );
}

function generateSpecElementDynamicChildCode({ t, xvdomApi, statements, instId }, childDesc, parentNodeVarId) {
  const { dynamic: { instanceContextId, instanceValueId }, isOnlyChild } = childDesc;
  statements.push(
    t.expressionStatement(
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
    )
  );
}

function generateSpecElementStaticChildCode({ t, xvdomApi, statements, instId }, { astValueNode, isOnlyChild }, parentNodeVarId) {
  statements.push(
    t.expressionStatement(
      // Optimization: https://jsperf.com/textcontent-vs-createtextnode-vs-innertext
      isOnlyChild
        ? (// _n.textContent = "hello" + 5;
            t.assignmentExpression('=',
              t.memberExpression(parentNodeVarId, t.identifier('textContent')),
              astValueNode
            )
          )
        : (// _n.appendChild(document.createTextNode(("hello" + 5) || ""));
            t.callExpression(
              t.memberExpression(parentNodeVarId, t.identifier('appendChild')),
              [
                t.callExpression(
                  t.memberExpression(t.identifier('document'), t.identifier('createTextNode')),
                  [astValueNode]
                )
              ]
            )
          )
    )
  );
}

function generateSpecCreateComponentCode(context, el, depth) {
  const { t, instId, xvdomApi, tmpVars, statements } = context;
  const componentId = t.identifier(el.tag);
  const propsArg = !el.props.length
    ? t.nullLiteral()
    : obj(
        t,
        el.props.reduce(
          ((acc, { astNameId, astValueNode, dynamic }) => (
            acc[astNameId.name] = dynamic ? t.memberExpression(instId, dynamic.instanceValueId) : astValueNode,
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
  if(el.numDynamicProps) {
    createComponentCode = t.assignmentExpression('=',
      t.memberExpression(instId, el.instanceContextId),
      createComponentCode
    )
  }

  const createCode = t.memberExpression(createComponentCode, t.identifier('$n'))

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  if(tmpVars[depth]) {
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
  if(depth) {
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

function generateSpecCreateHTMLElementCode(context, el, depth) {
  const { t, xvdomApi, tmpVars, statements, shouldGenerateDynamicPropCode } = context;

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
  if(!tmpVars[depth]) {
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
  const nodeVarId = tmpVars[depth].id
  el.props.forEach((prop, i) => {
    if(shouldGenerateDynamicPropCode || !prop.dynamic) {
      // Optimization: Only assign the instanceContextId once
      generateAssignDynamicProp(
        context,
        nodeVarId,
        prop,
        (
          i === 0 && 
          prop.dynamic &&
          t.memberExpression(context.instId, prop.dynamic.instanceContextId)
        )
      );
    }
  });

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if(depth) {
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
    if (childDesc instanceof JSXHTMLElement) {
      generateSpecCreateHTMLElementCode(context, childDesc, depth);
    }
    else if (childDesc instanceof JSXElement) {
      generateSpecCreateComponentCode(context, childDesc, depth)
    }
    else if (childDesc instanceof JSXValueElement) {
      if (childDesc.dynamic) {
        generateSpecElementDynamicChildCode(context, childDesc, tmpVar);
      }
      else {
        generateSpecElementStaticChildCode(context, childDesc, tmpVar);
      }
    }
  });
}

const distanceFromEnds = ({ index, distFromEnd }) => Math.min(index, distFromEnd);
const sortDistanceFromEnds = (a, b) => distanceFromEnds(a.el) - distanceFromEnds(b.el); 

function sortDynamicsByDepthThenDistanceFromEnds(dynamics) {
  return (
    dynamics
      .reduce((depthGroups, d) => {
        const depth = d.el.depth;
        (depthGroups[depth] || (depthGroups[depth] = [])).push(d);
        return depthGroups;
      }, [])
      .reduce((result, group) => (
        [...result, ...group.sort(sortDistanceFromEnds)]
      ), [])
  );
}

function expressionForRelationOrAssign(t, relationOrAssign) {
  return (
    typeof relationOrAssign === 'string'
      ? t.identifier(relationOrAssign)
      :  generateMemberExpression(t, relationOrAssign)
  );
}

function generateMemberExpression(t, { tmpVar, path }) {
  if(!path) return tmpVar;
  return t.assignmentExpression('=',
    t.identifier(tmpVar.name),
    path.slice(1).reduce(
      (acc, relationOrAssign) => (
        t.memberExpression(acc, expressionForRelationOrAssign(t, relationOrAssign))
      ),
      expressionForRelationOrAssign(t, path[0])
    )
  );
}

function getTmpVarForNode(t, savedNodesToTmpVarId, el) {
  let tmpVar = savedNodesToTmpVarId.get(el);
  return tmpVar || (
    tmpVar = tmpVarId(t, savedNodesToTmpVarId.size),
    savedNodesToTmpVarId.set(el, tmpVar),
    tmpVar
  );
}

function generateSpecCreateCloneableDynamicPropCode(context, dynamic, savedNodesToTmpVarId) {
  const { t } = context;
  let path = dynamic.el.rootPath;
  let el, parentEl;
  let rootAssignExpr, curAssignExpr, pathMembers;
  const originalSavedNodes = new Set(savedNodesToTmpVarId.keys());

  if(!path.parent) {
    rootAssignExpr = {
      tmpVar: getTmpVarForNode(t, savedNodesToTmpVarId, path.el)
    }
  }
  else{
    while(path.parent && !originalSavedNodes.has(el = path.el)) {
      parentEl = path.parent.el;
      pathMembers = [
        ...(
            savedNodesToTmpVarId.has(parentEl) ? [ savedNodesToTmpVarId.get(parentEl).name ]
          : path.parent.parent                 ? EMPTY_ARRAY
          : [ getTmpVarForNode(t, savedNodesToTmpVarId, parentEl).name ]
        ),
        el.relationshipTo(parentEl)
      ]

      // Optimization: Inline the assignment of the saved nodes in the member expression
      //               to the dynamic node
      if(!originalSavedNodes.has(el) && path.shouldBeSaved) {
        const newCur = {
          tmpVar: getTmpVarForNode(t, savedNodesToTmpVarId, el),
          path: pathMembers
        };

        if(curAssignExpr) curAssignExpr.path.unshift(newCur);
        rootAssignExpr = rootAssignExpr || newCur;

        curAssignExpr = newCur;
      }
      else{
        curAssignExpr.path.unshift(...pathMembers);
      }

      path = path.parent;
    }
  }

  generateAssignDynamicProp(
    context,
    generateMemberExpression(t, rootAssignExpr),
    dynamic.prop,
    (
      !originalSavedNodes.has(dynamic.el) &&
      dynamic.prop.dynamic &&
      t.memberExpression(context.instId, dynamic.instanceContextId)
    )
  );
}

function generateSpecCreateCloneableDynamicCode(context, rootEl, rootElId, dynamics) {
  const { t, tmpVars } = context;
  const savedNodesToTmpVarId = new Map();
  const sortedDynamics = sortDynamicsByDepthThenDistanceFromEnds(dynamics);
  let d;

  // Calculate shortest paths
  for(d of sortedDynamics) {
    getPath(d.el, undefined, true).finalize();
  }

  for(d of sortedDynamics) {
    // TODO: Handle dynamic children
    if(d instanceof DynamicChild) return;

    log('dynamicsPath', d.el.rootPath.toString());

    // Generate member expression for path
    generateSpecCreateCloneableDynamicPropCode(context, d, savedNodesToTmpVarId);
  }

  for(let [el, tmpVarId] of savedNodesToTmpVarId.entries()) {
    if(el !== rootEl) tmpVars.push(t.variableDeclarator(tmpVarId));
  }
}

function generateSpecCreateCloneableElementCode(context, el, isCloneable, dynamics) {
  const { t, tmpVars, xvdomApi } = context;
  const rootElId = tmpVarId(t, 0);
  const specNodeId = xvdomApi.definePrefixed('xvdomSpecNode', t.nullLiteral()).uniqueNameId;
  const createSpecContext =
    Object.assign({}, context, {
      statements:[], tmpVars:[], shouldGenerateDynamicPropCode: false
    });

  // function _xvdomSpecNodeCreate() {
  //   ...
  // }
  generateSpecCreateElementCode(createSpecContext, el);

  const createSpecNodeId = xvdomApi.definePrefixed(
    'xvdomSpecNodeCreate',
    t.functionExpression(null, EMPTY_ARRAY, t.blockStatement([
      t.variableDeclaration('var', createSpecContext.tmpVars),
      ...createSpecContext.statements,
      t.returnStatement(createSpecContext.tmpVars[0].id)
    ]))
  ).uniqueNameId;

  // var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true);
  tmpVars.push(
    t.variableDeclarator(
      rootElId,
      t.callExpression(
        t.memberExpression(
          t.logicalExpression('||',
            specNodeId,
            t.assignmentExpression('=',
              specNodeId,
              t.callExpression(createSpecNodeId, EMPTY_ARRAY)
            )
          ),
          t.identifier('cloneNode')
        ),
        [t.booleanLiteral(true)]
      )
    )
  );

  generateSpecCreateCloneableDynamicCode(context, el, rootElId, dynamics);
}

function generateSpecCreateElementCode(context, el) {
  if(el instanceof JSXHTMLElement) generateSpecCreateHTMLElementCode(context, el, 0);
  else generateSpecCreateComponentCode(context, el, 0);
}

function generateSpecCreateCode(t, xvdomApi, { rootElement, dynamics, hasComponents, isCloneable }) {
  const context = {
    t,
    xvdomApi,
    shouldGenerateDynamicPropCode: true,
    instId: instParamId(t),
    tmpVars: [],
    statements: []
  };

  if(isCloneable) generateSpecCreateCloneableElementCode(context, rootElement, isCloneable, dynamics);
  else generateSpecCreateElementCode(context, rootElement);

  // TODO: Remove this when we make generate methods request access for an instance prop
  const params = (hasComponents || dynamics.length) ? [instParamId(t)] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([
    t.variableDeclaration('var', context.tmpVars),
    ...context.statements,
    t.returnStatement(context.tmpVars[0].id)
  ]));
}

//TODO: function generateSpecUpdateDynamicPropCode() {}
//TODO: function generateSpecUpdateDynamicChildCode() {}

function generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, getTmpVar, dynamic) {
  const { instanceContextId, instanceValueId, astNameId, isOnlyChild, hasSideEffects } = dynamic;
  if(dynamic instanceof DynamicProp) {
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
              t.memberExpression(t.memberExpression(pInstId, instanceContextId), astNameId),
              tmpVar
            ),
            t.expressionStatement(
              t.assignmentExpression('=',
                t.memberExpression(t.memberExpression(pInstId, instanceContextId), astNameId),
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
            t.memberExpression(t.memberExpression(pInstId, instanceContextId), astNameId),
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

function generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component) {
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
                hash[p.astNameId.name] = (
                  !p.dynamic ? p.astValueNode : (
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

function generateSpecUpdateCode(t, xvdomApi, { dynamics, customElementsWithDynamicProps }) {
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
    [...customElementsWithDynamicProps].map(component =>
      generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component)
    )
  );

  const tmpVarDecl = tmpVar ? [t.variableDeclaration('var', [t.variableDeclarator(tmpVar)])] : EMPTY_ARRAY;

  return (
    t.functionExpression(
      null,
      [instId, pInstId],
      t.blockStatement([
        ...tmpVarDecl,
        ...updateDynamicPropCode,
        ...updateDynamicComponents
      ])
    )
  );
}

function generateInstanceCode(t, xvdomApi, { dynamics, key }, id) {
  return obj(t,
    dynamics.reduce(
      (acc, { instanceValueId, astValueNode }) => {
        acc[instanceValueId.name] = astValueNode;
        return acc;
      },
      Object.assign({ $s: id }, key && { key })
    )
  )
}

function generateRenderingCode(t, file, frag) {
  const xvdomApi = FileGlobals.forFile(t, file);
  const { uniqueNameId, value:specCode } = xvdomApi.definePrefixed('xvdomSpec',
    obj(t, {
      c: generateSpecCreateCode(t, xvdomApi, frag),
      u: generateSpecUpdateCode(t, xvdomApi, frag),
      r: t.memberExpression(t.identifier('xvdom'), t.identifier('DEADPOOL'))
    })
  );
  return {
    specCode,
    instanceCode: generateInstanceCode(t, xvdomApi, frag, uniqueNameId)
  }
}

module.exports = ({ types: t }) => ({
  visitor: {
    JSXElement: {
      exit(path, { file }) {
        if(t.isJSX(path.parent)) return;

        const template = new JSXFragment(t, path.node);
        const { instanceCode } = generateRenderingCode(t, file, template);
        path.replaceWith(instanceCode);
      }
    },
    Program: {
      exit(path, { file }) {
        const fileGlobals = FileGlobals.forFile(t, file).allGlobals;
        const globalKeys = fileGlobals ? Object.keys(fileGlobals) : EMPTY_ARRAY;
        if(!globalKeys.length) return;

        file.path.unshiftContainer('body',
          t.variableDeclaration('var',
            globalKeys.sort().map(key => {
              const { uniqueNameId, value } = fileGlobals[key];
              return t.variableDeclarator(uniqueNameId, value);
            })
          )
        );
      }
    }
  }
});
