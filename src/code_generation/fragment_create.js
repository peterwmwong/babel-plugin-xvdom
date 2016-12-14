const {
  DynamicChild,
  JSXElement,
  JSXHTMLElement,
  JSXValueElement
} = require('../parsing/JSXFragment.js'); 

const {
  getPath
} = require('../pathing/index.js');

const obj = require('./obj.js');

const {
  log
} = require('../logger.js');

const EMPTY_ARRAY    = [];
const instParamId = t => t.identifier('inst');
const tmpVarId = (t, num) => t.identifier(`_n${num ? ++num : ''}`);

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

module.exports = generateSpecCreateCode;

