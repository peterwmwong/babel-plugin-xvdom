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
const memberExpr = require('./memberExpr.js');

const {
  log
} = require('../logger.js');

const EMPTY_ARRAY = [];

function dynamicPropStatement(
  funcGen,
  domNodeExpression,
  { dynamic, astValueNode, astNameId },
  expressionToAssignDomNode
) {
  const { t } = funcGen;
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

function dynamicChildStatement(funcGen, childDesc, parentNodeVarId) {
  const { t } = funcGen
  const { dynamic: { instanceContextId, instanceValueId }, isOnlyChild } = childDesc;
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

function staticChildStatment({ t, xvdomApi, instId }, { astValueNode, isOnlyChild }, parentNodeVarId) {
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

function componentCode(funcGen, el, depth) {
  const { t } = funcGen;
  const componentId = t.identifier(el.tag);
  const propsArg = !el.props.length
    ? t.nullLiteral()
    : obj(
        t,
        el.props.reduce(
          ((acc, { astNameId, astValueNode, dynamic }) => (
            acc[astNameId.name] = (
              dynamic
                ? memberExpr(t, funcGen.accessInstance(), dynamic.instanceValueId)
                : astValueNode
            ),
            acc
          )),
          {}
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

  if(el.numDynamicProps) {
    createComponentCode = t.assignmentExpression('=',
      memberExpr(t, funcGen.accessInstance(), el.instanceContextId),
      createComponentCode
    )
  }

  const createCode = memberExpr(t, createComponentCode, '$n');

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  funcGen.defineOrSetTmpVar(depth, createCode);

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

function htmlElementCode(funcGen, el, depth, shouldGenerateDynamicPropCode) {
  const { t } = funcGen;
  // Create element
  // ex. _xvdomEl('div');
  const createCode = t.callExpression(
    funcGen.accessAPI('el'),
    [t.stringLiteral(el.tag)]
  );

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  funcGen.defineOrSetTmpVar(depth, createCode);

  // Assign props
  const nodeVarId = funcGen.getTmpVarId(depth);
  el.props.forEach((prop, i) => {
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
  });

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

  el.children.forEach(jsxElementChild => {
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
      : expressionForPath(t, relationOrAssign)
  );
}

function expressionForPath(t, { tmpVar, path }) {
  return (
    !path
      ? tmpVar
      : t.assignmentExpression('=',
          t.identifier(tmpVar.name),
          memberExpr(t, ...path.map(p => expressionForRelationOrAssign(t, p)))
        )
  );
}

function cloneableDynamicPropCode(funcGen, dynamic, savedNodesToTmpVarId) {
  function getTmpVarForNode(el) {
    let tmpVar = savedNodesToTmpVarId.get(el);
    return tmpVar || (
      // TODO: Find a better way then storing $index, maybe this should call funcGen.defineOrSetTmpVar
      tmpVar = Object.assign(funcGen.getTmpVarId(savedNodesToTmpVarId.size), { $index:  savedNodesToTmpVarId.size}),
      savedNodesToTmpVarId.set(el, tmpVar),
      tmpVar
    );
  }

  const { t } = funcGen;
  let path = dynamic.el.rootPath;
  let el, parentEl;
  let rootAssignExpr, curAssignExpr, pathMembers;
  const originalSavedNodes = new Set(savedNodesToTmpVarId.keys());

  if(!path.parent) {
    rootAssignExpr = { tmpVar: getTmpVarForNode(path.el) };
  }
  else{
    while(path.parent && !originalSavedNodes.has(el = path.el)) {
      parentEl = path.parent.el;
      pathMembers = [
        ...(
            savedNodesToTmpVarId.has(parentEl) ? [ savedNodesToTmpVarId.get(parentEl).name ]
          : path.parent.parent                 ? EMPTY_ARRAY
          : [ getTmpVarForNode(parentEl).name ]
        ),
        el.relationshipTo(parentEl)
      ]

      // Optimization: Inline the assignment of the saved nodes in the member expression
      //               to the dynamic node
      if(!originalSavedNodes.has(el) && path.shouldBeSaved) {
        const newCur = {
          tmpVar: getTmpVarForNode(el),
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

  return dynamicPropStatement(
    funcGen,
    expressionForPath(t, rootAssignExpr),
    dynamic.prop,
    (
      !originalSavedNodes.has(dynamic.el) &&
      dynamic.prop.dynamic &&
      memberExpr(t, funcGen.accessInstance(), dynamic.instanceContextId)
    )
  );
}

function cloneableDynamicsCode(funcGen, rootEl, rootElId, dynamics) {
  const { t } = funcGen;
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
    funcGen.addStatement(
      cloneableDynamicPropCode(funcGen, d, savedNodesToTmpVarId)
    );
  }

  for(let [el, tmpVarId] of savedNodesToTmpVarId.entries()) {
    if(el !== rootEl) funcGen.defineOrSetTmpVar(tmpVarId.$index);
  }
}

function cloneableElementCode(funcGen, el, isCloneable, dynamics) {
  const { t } = funcGen;
  const specNodeId = funcGen.definePrefixed('xvdomSpecNode', t.nullLiteral()).name;
  const createSpecFuncGen = new FunctionGenerator(t, funcGen.fileGlobals);

  // function _xvdomSpecNodeCreate() {
  //   ...
  // }
  elementCode(createSpecFuncGen, el, false);

  const createSpecNodeId = funcGen.definePrefixed(
    'xvdomSpecNodeCreate',
    createSpecFuncGen.code
  ).name;

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

  cloneableDynamicsCode(funcGen, el, funcGen.getTmpVarId(0), dynamics);
}

function elementCode(funcGen, el, shouldGenerateDynamicPropCode) {
  if(el instanceof JSXHTMLElement) htmlElementCode(funcGen, el, 0, shouldGenerateDynamicPropCode);
  else componentCode(funcGen, el, 0);
}

class FunctionGenerator {
  constructor(t, fileGlobals){
    let instId;
    this.t = t;
    this.fileGlobals = fileGlobals;
    this.tmpVars = [];
    this.statements = [];
  }

  accessAPI(name) { return this.fileGlobals.accessAPI(name); }

  definePrefixed(name, value) { return this.fileGlobals.definePrefixed(name, value); }

  getTmpVarId(i) { return this.t.identifier(`_n${i ? i+1 : ''}`); }

  defineOrSetTmpVar(i, value) {
    const { t } = this;
    // Temporary variable for this index has not be defined yet.
    // Store value as the temporary variable's initial value.
    if (!this.tmpVars[i]) {
      this.tmpVars[i] = value;
    }
    // ... otherwise, add a statement to assign the value to the
    // temporary variable.
    else {
      this.addStatement(
        t.expressionStatement(
          t.assignmentExpression('=', this.getTmpVarId(i), value)
        )
      );
    }
  }

  addStatement(stmt){ this.statements.push(stmt); }

  accessInstance(){ return this._instId || (this._instId = this.t.identifier('inst')); }

  get code(){
    const { t, tmpVars, statements, _instId } = this;
    const tmpVarDeclarators = tmpVars.map((value, i) =>
      t.variableDeclarator(this.getTmpVarId(i), value)
    );

    return t.functionExpression(
      null,
      (_instId ? [_instId] : EMPTY_ARRAY),
      t.blockStatement([
        t.variableDeclaration('var', tmpVarDeclarators),
        ...statements,
        t.returnStatement(this.getTmpVarId(0))
      ])
    );
  }
}


module.exports = function(t, xvdomApi, { rootElement, dynamics, hasComponents, isCloneable }) {
  const funcGen = new FunctionGenerator(t, xvdomApi);

  if(isCloneable) cloneableElementCode(funcGen, rootElement, isCloneable, dynamics);
  else elementCode(funcGen, rootElement, true);

  return funcGen.code;
}

