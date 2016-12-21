const {
  DynamicChild,
  JSXElement,
  JSXHTMLElement,
  JSXValueElement
} = require('../parsing/JSXFragment.js'); 

const {
  getPath
} = require('../pathing/index.js');


const FunctionGenerator = require('./function_generator.js');
const obj = require('./obj.js');
const memberExpr = require('./memberExpr.js');

const {
  log,
  LOGGING
} = require('../logger.js');

const EMPTY_ARRAY = [];

function dynamicPropStatement(funcGen, domNodeExpression, jsxElementProp, expressionToAssignDomNode) {
  const { t } = funcGen;
  const { dynamic, astValueNode, astNameId } = jsxElementProp;
  const valueCode = (
    dynamic
      ? memberExpr(t, funcGen.accessInstance(), dynamic.instanceValueId)
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
      memberExpr(t, domNodeExpression, astNameId),
      valueCode
    )
  );

  return (
    !dynamic.hasSideEffects
      ? exprStmt
      : t.ifStatement(
          t.binaryExpression('!=', valueCode, t.nullLiteral()),
          exprStmt
        )
  );
}

function dynamicChildStatement(funcGen, jsxValueElement, parentNodeVarId) {
  const { t } = funcGen
  const { dynamic: { instanceContextId, instanceValueId }, isOnlyChild } = jsxValueElement;
  const instId = funcGen.accessInstance();

  return t.expressionStatement(
    t.assignmentExpression('=',
      memberExpr(t, instId, instanceContextId),
      t.callExpression(
        funcGen.accessAPI('createDynamic'),
        [
          t.booleanLiteral(isOnlyChild),
          parentNodeVarId,
          memberExpr(t, instId, instanceValueId)
        ]
      )
    )
  );
}

function staticChildStatment(funcGen, jsxValueElement, parentNodeVarId) {
  const { t } = funcGen;
  const { astValueNode, isOnlyChild } = jsxValueElement;
  
  return t.expressionStatement(
    // Optimization: https://jsperf.com/textcontent-vs-createtextnode-vs-innertext
    isOnlyChild
      ? (// _n.textContent = "hello" + 5;
          t.assignmentExpression('=',
            memberExpr(t, parentNodeVarId, 'textContent'),
            astValueNode
          )
        )
      : (// _n.appendChild(document.createTextNode(("hello" + 5) || ""));
          t.callExpression(
            memberExpr(t, parentNodeVarId, 'appendChild'),
            [
              t.callExpression(
                memberExpr(t, 'document', 'createTextNode'),
                [astValueNode]
              )
            ]
          )
        )
  );
}

function componentCode(funcGen, jsxElement, depth) {
  const { t } = funcGen;
  const { instanceContextId, numDynamicProps, props, tag } = jsxElement;
  const componentId = t.identifier(tag);
  const propsArg = (
    !props.length
      ? t.nullLiteral()
      : obj(t,
          props.reduce(((acc, { astNameId, astValueNode, dynamic }) => (
            acc[astNameId.name] = (
              dynamic
                ? memberExpr(t, funcGen.accessInstance(), dynamic.instanceValueId)
                : astValueNode
            ),
            acc
          )), {})
        )
  );

  // Create element
  // ex. _xvdomCreateComponent('div');
  let createComponentCode = (
    t.callExpression(
      funcGen.accessAPI('createComponent'),
      [
        componentId,
        memberExpr(t, componentId, 'state'),
        propsArg,
        funcGen.accessInstance()
      ]
    )
  );

  if(numDynamicProps) {
    createComponentCode = t.assignmentExpression('=',
      memberExpr(t, funcGen.accessInstance(), instanceContextId),
      createComponentCode
    )
  }

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  funcGen.defineOrSetTmpVar(depth, memberExpr(t, createComponentCode, '$n'));

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if(depth) {
    funcGen.addStatement(
      t.expressionStatement(
        t.callExpression(
          memberExpr(t, funcGen.getTmpVarId(depth - 1), 'appendChild'),
          [funcGen.getTmpVarId(depth)]
        )
      )
    );
  }
}

function htmlElementCode(funcGen, jsxHTMLElement, depth, shouldGenerateDynamicPropCode) {
  const { t } = funcGen;
  // Create element
  // ex. _xvdomEl('div');
  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  funcGen.defineOrSetTmpVar(
    depth,
    t.callExpression(
      funcGen.accessAPI('el'),
      [t.stringLiteral(jsxHTMLElement.tag)]
    )
  );

  // Assign props
  const nodeVarId = funcGen.getTmpVarId(depth);
  let i=0;
  for(let prop of jsxHTMLElement.props) {
    if(shouldGenerateDynamicPropCode || !prop.dynamic) {
      // Optimization: Only assign the instanceContextId once
      funcGen.addStatement(
        dynamicPropStatement(
          funcGen,
          nodeVarId,
          prop,
          (
            i === 0 && 
            prop.dynamic &&
            memberExpr(t, funcGen.accessInstance(), prop.dynamic.instanceContextId)
          )
        )
      );
    }
    i++;
  };

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if(depth) {
    funcGen.addStatement(
      t.expressionStatement(
        t.callExpression(
          memberExpr(t, funcGen.getTmpVarId(depth-1), 'appendChild'),
          [nodeVarId]
        )
      )
    );
  }

  ++depth;

  for (let jsxElementChild of jsxHTMLElement.children) {
    if (jsxElementChild instanceof JSXHTMLElement) {
      htmlElementCode(funcGen, jsxElementChild, depth, shouldGenerateDynamicPropCode);
    }
    else if (jsxElementChild instanceof JSXElement) {
      componentCode(funcGen, jsxElementChild, depth)
    }
    else if (jsxElementChild instanceof JSXValueElement) {
      funcGen.addStatement(
        jsxElementChild.dynamic
          ? dynamicChildStatement(funcGen, jsxElementChild, nodeVarId)
          : staticChildStatment(funcGen, jsxElementChild, nodeVarId)
      )
    }
  }
}

const distanceFromEnds = ({ index, distFromEnd }) => Math.min(index, distFromEnd);
const sortDistanceFromEnds = (a, b) => distanceFromEnds(a.el) - distanceFromEnds(b.el); 

const sortDynamicsByDepthThenDistanceFromEnds = dynamics => (
  dynamics
    .reduce((depthGroups, d) => {
      const depth = d.el.depth;
      (depthGroups[depth] || (depthGroups[depth] = [])).push(d);
      return depthGroups;
    }, [])
    .reduce((result, group) => [...result, ...group.sort(sortDistanceFromEnds)], [])
);

const expressionForRelationOrAssign = (t, relationOrAssign) => (
  typeof relationOrAssign === 'string'
    ? t.identifier(relationOrAssign)
    : expressionForPath(t, relationOrAssign)
);

const expressionForPath = (t, { tmpVar, pathMembers }) => (
  !pathMembers
    ? tmpVar
    : t.assignmentExpression('=',
        tmpVar,
        memberExpr(t, ...pathMembers.map(p => expressionForRelationOrAssign(t, p)))
      )
);

function cloneableDynamicPropCode(funcGen, dynamic, elToTmpVarId) {
  const hasTmpVar = el => elToTmpVarId.has(el);
  function getOrAllocateTmpVar(el) {
    if(!hasTmpVar(el)) elToTmpVarId.set(el, elToTmpVarId.size);
    return funcGen.getTmpVarId(elToTmpVarId.get(el));
  }

  const { t } = funcGen;
  let path = dynamic.rootPath;
  let el, parentEl;
  let rootAssignExpr, curAssignExpr, pathMembers;
  const originalSavedEls = new Set(elToTmpVarId.keys());

  if(hasTmpVar(path.el) || !path.parent) {
    rootAssignExpr = { tmpVar: getOrAllocateTmpVar(path.el) };
  }
  else{
    while(path.parent && !originalSavedEls.has(el = path.el)) {
      parentEl = path.parent.el;
      pathMembers = [
        ...(
          hasTmpVar(parentEl) || !path.parent.parent
            ? [ getOrAllocateTmpVar(parentEl).name ]
            :  EMPTY_ARRAY
        ),
        el.relationshipTo(parentEl)
      ];

      // Optimization: Inline the assignment of the saved nodes in the member expression
      //               to the dynamic node
      if(!originalSavedEls.has(el) && path.shouldBeSaved) {
        const newCur = {
          pathMembers,
          tmpVar: getOrAllocateTmpVar(el)
        };

        if(curAssignExpr) curAssignExpr.pathMembers.unshift(newCur);
        rootAssignExpr = rootAssignExpr || newCur;

        curAssignExpr = newCur;
      }
      else{
        curAssignExpr.pathMembers.unshift(...pathMembers);
      }

      path = path.parent;
    }
  }

  return dynamicPropStatement(
    funcGen,
    expressionForPath(t, rootAssignExpr),
    dynamic.prop,
    (
      !originalSavedEls.has(dynamic.el) &&
      dynamic.prop.dynamic &&
      memberExpr(t, funcGen.accessInstance(), dynamic.instanceContextId)
    )
  );
}

function cloneableDynamicsCode(funcGen, rootEl, dynamics) {
  const { t } = funcGen;
  const elToTmpVarId = new Map();
  const sortedDynamics = sortDynamicsByDepthThenDistanceFromEnds(dynamics);

  // Calculate shortest paths
  for(let d of sortedDynamics) {
    d.rootPath = getPath(d.el, undefined, true).finalize();
  }

  for(let d of sortedDynamics) {
    // TODO: Handle dynamic children
    if(d instanceof DynamicChild) return;

    if(LOGGING.dynamicsPath) log('dynamicsPath', d.rootPath.toString());

    // Generate member expression for path
    funcGen.addStatement(
      cloneableDynamicPropCode(funcGen, d, elToTmpVarId)
    );
  }

  elToTmpVarId.delete(rootEl);
  for(let [el, tmpVarId] of elToTmpVarId.entries()) {
    funcGen.defineOrSetTmpVar(tmpVarId);
  }
}

function cloneableElementCode(funcGen, jsxFragment) {
  const { rootElement, isCloneable, dynamics } = jsxFragment;
  const { t } = funcGen;
  const specNodeId = funcGen.definePrefixedGlobal('xvdomSpecNode', t.nullLiteral());
  const createSpecFuncGen = new FunctionGenerator(t, funcGen.fileGlobals);

  // function _xvdomSpecNodeCreate() {
  //   ...
  // }
  elementCode(createSpecFuncGen, rootElement, false);

  const createSpecNodeId = funcGen.definePrefixedGlobal(
    'xvdomSpecNodeCreate',
    createSpecFuncGen.code
  );

  // var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true);
  funcGen.defineOrSetTmpVar(0,
    t.callExpression(
      memberExpr(t, 
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
  );

  cloneableDynamicsCode(funcGen, rootElement, dynamics);
}

function elementCode(funcGen, el, shouldGenerateDynamicPropCode) {
  if(el instanceof JSXHTMLElement) htmlElementCode(funcGen, el, 0, shouldGenerateDynamicPropCode);
  else componentCode(funcGen, el, 0);
}

module.exports = function(t, fileGlobals, jsxFragment) {
  const { rootElement, dynamics, hasComponents, isCloneable } = jsxFragment;
  const funcGen = new FunctionGenerator(t, fileGlobals);

  if(isCloneable) cloneableElementCode(funcGen, jsxFragment);
  else elementCode(funcGen, rootElement, true);

  return funcGen.code;
}

