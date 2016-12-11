const {
  JSXElement,
  JSXElementValueChild,
  JSXFragment
} = require('./parsing/JSXFragment.js'); 

const {
  LOGGING,
  log,
  logFunc
} = require('./logger.js');

const PROP_EL        = 'elProp';

const EMPTY_ARRAY    = [];

const nonComponentPropDynamic = ({ el }) => !el || !el.isComponent;
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
  { dynamic, valueNode, nameId },
  expressionToAssignDomNode
) {
  const valueCode = (
    dynamic
      ? t.memberExpression(instId, dynamic.instanceValueId)
      : valueNode
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
      t.memberExpression(domNodeExpression, nameId),
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

function generateSpecElementStaticChildCode({ t, xvdomApi, statements, instId }, { valueNode, isOnlyChild }, parentNodeVarId) {
  statements.push(
    t.expressionStatement(
      // Optimization: https://jsperf.com/textcontent-vs-createtextnode-vs-innertext
      isOnlyChild
        ? (// _n.textContent = "hello" + 5;
            t.assignmentExpression('=',
              t.memberExpression(parentNodeVarId, t.identifier('textContent')),
              valueNode
            )
          )
        : (// _n.appendChild(document.createTextNode(("hello" + 5) || ""));
            t.callExpression(
              t.memberExpression(parentNodeVarId, t.identifier('appendChild')),
              [
                t.callExpression(
                  t.memberExpression(t.identifier('document'), t.identifier('createTextNode')),
                  [valueNode]
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
  if(el.hasDynamicProps) {
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
    if (childDesc instanceof JSXElement) {
      return (
        childDesc.isComponent
          ? generateSpecCreateComponentCode(context, childDesc, depth)
          : generateSpecCreateHTMLElementCode(context, childDesc, depth)
      );
    }
    
    if (childDesc instanceof JSXElementValueChild) {
      return (
        childDesc.dynamic
          ? generateSpecElementDynamicChildCode(context, childDesc, tmpVar)
          : generateSpecElementStaticChildCode(context, childDesc, tmpVar)
      );
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
      .reduce((result, group) => {
        result.push(...group.sort(sortDistanceFromEnds));
        return result;
      }, [])
  );
}

let LAST_PATH_ID = 0;
class Path {
  static min(a, b) {
    log('path', `min: ${a.id}(${a.length}) < ${b.id}(${b.length})`);
    return a.length < b.length ? a : b;
  }

  constructor(el, hardRef = false) {
    this.pathId = ++LAST_PATH_ID;
    this.el = el;
    this.parent = null;
    this.isHardReferenced = hardRef;
    this.numReferencingPaths = 0;
  }

  // TODO: consider renaming this to something more explicit...
  //        - lengthToRootOrSaved
  get length() {
    return (
        this.isHardReferenced ? 0
      : this.parent           ? (this.parent.length + 1)
      : Number.MAX_SAFE_INTEGER
    );
  }

  get tag() { return this.el.tag; }

  get shouldBeSaved() {
    const { el: { rootPath }, isHardReferenced, numReferencingPaths } = this;
    return (
      isHardReferenced ||
      numReferencingPaths > 1 ||
      (rootPath && rootPath !== this && rootPath.shouldBeSaved)
    );
  }

  get id() {
    const referenceIndicator = (
        this.isHardReferenced ? '*'
      : this.shouldBeSaved    ? '^'
      : ''
    );
    return `${referenceIndicator}${this.el.tag}(${this.pathId})`
  }

  isShorterOrEqualThan(b) {
    const a = this;
    const aEl = a.el;
    const bEl = b.el;
    log('path',
      'isShorterOrEqualThan:',
      `length: ${a.id}(${a.length}) < ${b.id}(${b.length})`,
      `elNumDynamicDescendants: ${aEl.numContainedDynamics} < ${bEl.numContainedDynamics}`,
      `hasDynamicProps: ${aEl.hasDynamicProps} < ${bEl.hasDynamicProps}`
    );
    return 0 >= (
      Math.sign(a.length - b.length) ||
      Math.sign(bEl.numContainedDynamics - aEl.numContainedDynamics) ||
      // TODO: consider changing hasDynamicProps to numDynamicProps 
      Math.sign(+aEl.hasDynamicProps - +bEl.hasDynamicProps)
    );
  }

  toString() {
    const result = [];
    let path = this;
    while(path) {
      result.push(path.id);
      path = path.parent;
    }
    return result.join(', ');
  }

  finalize(pathHead) {
    return logFunc('path',
      `finalize ${this.id}`,
      () => {
        this.addReference();
        this.el.rootPath = this;

        const { parent } = this; 
        if((!pathHead || !this.shouldBeSaved) && parent && !parent.isHardReferenced) {
          parent.finalize(this);
        }
        return this;
      }
    );
  }

  removeReference() {
    logFunc('path',
      `removeReference ${this.id} numReferencingPaths = ${this.numReferencingPaths}`,
      () => {
        const { el: { rootPath } } = this;
        if(rootPath && rootPath !== this) {
          log('path', `adding reference to previous rootPath ${rootPath.id}`);
          rootPath.removeReference();
        }

        --this.numReferencingPaths;
      },
      () => `-> ${this.numReferencingPaths}`
    );
  }

  addReference() {
    logFunc('path',
      `addReference ${this.id} numReferencingPaths = ${this.numReferencingPaths}`,
      () => {
        const { el: { rootPath } } = this;
        if(rootPath && rootPath !== this) {
          log('path', `adding reference to previous rootPath ${rootPath.id}`);
          rootPath.addReference();
        }

        const { shouldBeSaved } = this;
        ++this.numReferencingPaths;

        /*
        Make sure a parent is not saved when it isn't necessary to.
        Example:

        <a cloneable>
          <b />
          <d>
            <e>
              <i>
                <j>
                  <l id={var1} />
                </j>
                <k>
                  <m id={var1} />
                </k>
              </i>
            </e>
            <f id={var1} />
            <g>
              <h id={var1} />
            </g>
          </d>
          <c id={var1} />
        </a>

        ...without this <e> would be saved.
        */
        if(!shouldBeSaved && this.shouldBeSaved && this.parent) {
          this.parent.removeReference();
        }
      },
      () => `-> ${this.numReferencingPaths}`
    );
  }
}

function getPath(el, ignoreEl, isHardReferenced) {
  return logFunc('path',
    `getPath ${el.tag}`,
    () => el.rootPath ? el.rootPath : calcPath(el, ignoreEl, isHardReferenced),
    result => `[ ${result.toString()} ]`
  );
}

function calcPath(el, ignoreEl, isHardReferenced) {
  const { parent } = el;
  if(!parent) return new Path(el, true);
  if(ignoreEl) log('path', 'ignoreEl', ignoreEl.tag);

  const path = new Path(el, isHardReferenced);
  const { distFromEnd, index, previousSibling, nextSibling } = el;
  let parentPath;

  if(index === 0) {
    parentPath = (
      ignoreEl === nextSibling
        ? getPath(parent)
        : Path.min(getPath(parent), getPath(nextSibling, el))
    );
  }
  else if(distFromEnd === 0) {
    parentPath = (
      ignoreEl === previousSibling
        ? getPath(parent)
        : Path.min(getPath(parent), getPath(previousSibling, el))
    );
  }
  else if(
    ignoreEl === previousSibling || (
      ignoreEl !== nextSibling &&
      getPath(nextSibling, el).isShorterOrEqualThan(getPath(previousSibling, el))
    )
  ) {
    parentPath = getPath(nextSibling, el);
  }
  else {
    parentPath = getPath(previousSibling, el);
  }

  path.parent = parentPath;
  return path;
}

// Determine the relationship from one element to another (ex. parent, next sibling, previous sibling)
function getElementRelationshipTo(el, otherEl) {
  return (
      el === otherEl.firstChild      ? 'firstChild'
    : el === otherEl.lastChild       ? 'lastChild'
    : el === otherEl.nextSibling     ? 'nextSibling'
    : el === otherEl.previousSibling ? 'previousSibling'
    : 'UNKNOWN'
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
  if(tmpVar) return tmpVar;

  tmpVar = tmpVarId(t, savedNodesToTmpVarId.size);
  savedNodesToTmpVarId.set(el, tmpVar);
  return tmpVar;
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
        )
        ,
        getElementRelationshipTo(el, parentEl)
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

  log('dynamicsPath', JSON.stringify(rootAssignExpr, null, 2));
  // log('dynamicsPath', generateMemberExpression(t, rootAssignExpr));
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
    if(d.type !== PROP_EL) return;

    log('dynamicsPath', d.el.rootPath.toString());

    // Generate member expression for path
    generateSpecCreateCloneableDynamicPropCode(context, d, savedNodesToTmpVarId);
  }

  for(let [el, tmpVarId] of savedNodesToTmpVarId.entries()) {
    if(el !== rootEl) tmpVars.push(t.variableDeclarator(tmpVarId));
  }
}

function generateSpecCreateCloneableElementCode(context, el, cloneable/* cloneable */, dynamics) {
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
  if(!el.isComponent) generateSpecCreateHTMLElementCode(context, el, 0);
  else generateSpecCreateComponentCode(context, el, 0);
}

function generateSpecCreateCode(t, xvdomApi, { rootElement, dynamics, hasComponents, cloneable }) {
  const context = {
    t,
    xvdomApi,
    shouldGenerateDynamicPropCode: true,
    instId: instParamId(t),
    tmpVars: [],
    statements: []
  };

  if(cloneable) generateSpecCreateCloneableElementCode(context, rootElement, cloneable, dynamics);
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
  const { type, instanceContextId, instanceValueId, name, isOnlyChild, hasSideEffects } = dynamic;
  if(type === PROP_EL) {
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

function generateSpecUpdateCode(t, xvdomApi, { dynamics, componentsWithDyanmicProps }) {
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
    [...componentsWithDyanmicProps].map(component =>
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
      (acc, { instanceValueId, value }) => {
        acc[instanceValueId.name] = value;
        return acc;
      },
      Object.assign({ $s: id }, key && { key })
    )
  )
}

function generateRenderingCode(t, file, template) {
  const xvdomApi = FileGlobals.forFile(t, file);
  const { uniqueNameId, value:specCode } = xvdomApi.definePrefixed('xvdomSpec',
    obj(t, {
      c: generateSpecCreateCode(t, xvdomApi, template),
      u: generateSpecUpdateCode(t, xvdomApi, template),
      r: t.memberExpression(t.identifier('xvdom'), t.identifier('DEADPOOL'))
    })
  );
  return {
    specCode,
    instanceCode: generateInstanceCode(t, xvdomApi, template, uniqueNameId)
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
