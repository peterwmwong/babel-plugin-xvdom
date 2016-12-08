const {
  buildChildren,
  toReference
} = require('./helpers.js');

const {
  LOGGING,
  log,
  logFunc
} = require('./logger.js');

const genId = require('./genId.js');

const NODE_EL        = 'el';
const NODE_COMPONENT = 'component';
const NODE_STATIC    = 'staticChild';
const NODE_DYNAMIC   = 'dynamicChild';

const PROP_COMPONENT = 'componentProp';
const PROP_EL        = 'elProp';

const EMPTY_ARRAY    = [];

const isCloneableAttribute    = attr => attr.name.name === 'cloneable';
const isKeyAttribute          = attr => attr.name.name === 'key';
const isXvdomAttribute        = attr => isCloneableAttribute(attr) || isKeyAttribute(attr);
const isComponentName         = name => /^[A-Z]/.test(name);

const nonComponentPropDynamic = ({ type }) => type !== PROP_COMPONENT;
const instParamId             = t          => t.identifier('inst');
const prevInstParamId         = t          => t.identifier('pInst');
const tmpVarId                = (t, num)   => t.identifier(`_n${num ? ++num : ''}`);
const xvdomApiFuncName        = name       => `xvdom${name[0].toUpperCase()}${name.slice(1)}`;

const hasSideEffects = (tag, propName) => (
  (tag === 'input' && propName === 'value') ||
  (tag === 'a'     && propName === 'href')
);

const _fileGlobalForFile = new WeakMap();
class FileGlobals{
  static forFile(t, file){
    return (
      _fileGlobalForFile.get(file) ||
        _fileGlobalForFile
          .set(file, new FileGlobals(t, file))
          .get(file)
    );
  }

  constructor(t, file){
    this._t = t;
    this._file = file;
    this._definedPrefixCounts = new Map();
    this._globals = {};
  }

  definePrefixed(name, value){
    const { _definedPrefixCounts } = this;
    const count = 1 + (_definedPrefixCounts.get(name) | 0);
    const globalId = count === 1 ? name : name + count;

    _definedPrefixCounts.set(name, count);
    return this._globals[globalId] = {
      uniqueNameId: this._file.scope.generateUidIdentifier(name),
      value
    };
  }

  accessFunction(apiFuncName){
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

  get allGlobals(){ return this._globals; }
}

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

function generateAssignDynamicProp(
  { t, instId, statements },
  domNodeExpression,
  { isDynamic, dynamic, valueNode, nameId }
){
  const valueCode = (
    isDynamic
      ? t.memberExpression(instId, dynamic.instanceValueId)
      : valueNode
  );

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
  const { t, xvdomApi, tmpVars, statements, shouldGeneratePropsCode } = context;

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
  // if (shouldGeneratePropsCode) generateAssignPropsCode(context, tmpVars[depth].id, el);
  if (shouldGeneratePropsCode){
    const nodeVarId = tmpVars[depth].id
    el.props.forEach((prop, i) => {
      // Optimization: Only assign the instanceContextId once
      if(i === 0 && prop.isDynamic){
        statements.push(
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(context.instId, prop.dynamic.instanceContextId),
              nodeVarId
            )
          )
        );
      }
      generateAssignDynamicProp(context, nodeVarId, prop);
    });
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

const distanceFromEnds = ({ index, distFromEnd }) => Math.min(index, distFromEnd);
const sortDistanceFromEnds = (a, b) => distanceFromEnds(a.el) - distanceFromEnds(b.el); 

function sortDynamicsByDepthThenDistanceFromEnds(dynamics){
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
class Path{
  static min(a, b){
    log('path', `min: ${a.id}(${a.length}) < ${b.id}(${b.length})`);
    return a.length < b.length ? a : b;
  }

  constructor(el, hardRef = false){
    this.pathId = ++LAST_PATH_ID;
    this.el = el;
    this.parent = null;
    this.isHardReferenced = hardRef;
    this.numReferencingPaths = 0;
  }

  // TODO: consider renaming this to something more explicit...
  //        - lengthToRootOrSaved
  get length(){
    return (
        this.isHardReferenced ? 0
      : this.parent           ? (this.parent.length + 1)
      : Number.MAX_SAFE_INTEGER
    );
  }

  get tag(){ return this.el.tag; }

  get shouldBeSaved(){
    const { el: { rootPath }, isHardReferenced, numReferencingPaths } = this;
    return (
      isHardReferenced ||
      numReferencingPaths > 1 ||
      (rootPath && rootPath !== this && rootPath.shouldBeSaved)
    );
  }

  get id(){
    const referenceIndicator = (
        this.isHardReferenced ? '*'
      : this.shouldBeSaved    ? '^'
      : ''
    );
    return `${referenceIndicator}${this.el.tag}(${this.pathId})`
  }

  isShorterOrEqualThan(b){
    const a = this;
    const aEl = a.el;
    const bEl = b.el;
    log('path',
      'isShorterOrEqualThan:',
      `length: ${a.id}(${a.length}) < ${b.id}(${b.length})`,
      `elNumDynamicDescendants: ${aEl.numDynamicDescendants} < ${bEl.numDynamicDescendants}`,
      `hasDynamicProps: ${aEl.hasDynamicProps} < ${bEl.hasDynamicProps}`
    );
    return 0 >= (
      Math.sign(a.length - b.length) ||
      Math.sign(bEl.numDynamicDescendants - aEl.numDynamicDescendants) ||
      // TODO: consider changing hasDynamicProps to numDynamicProps 
      Math.sign(+aEl.hasDynamicProps - +bEl.hasDynamicProps)
    );
  }

  toString(){
    const result = [];
    let path = this;
    while(path){
      result.push(path.id);
      path = path.parent;
    }
    return result.join(', ');
  }

  finalize(pathHead){
    return logFunc('path',
      `finalize ${this.id}`,
      () => {
        this.addReference();
        this.el.rootPath = this;

        const { parent } = this; 
        if((!pathHead || !this.shouldBeSaved) && parent && !parent.isHardReferenced){
          parent.finalize(this);
        }
        return this;
      }
    );
  }

  removeReference(){
    logFunc('path',
      `removeReference ${this.id} numReferencingPaths = ${this.numReferencingPaths}`,
      () => {
        const { el: { rootPath } } = this;
        if(rootPath && rootPath !== this){
          log('path', `adding reference to previous rootPath ${rootPath.id}`);
          rootPath.removeReference();
        }

        --this.numReferencingPaths;
      },
      () => `-> ${this.numReferencingPaths}`
    );
  }

  addReference(){
    logFunc('path',
      `addReference ${this.id} numReferencingPaths = ${this.numReferencingPaths}`,
      () => {
        const { el: { rootPath } } = this;
        if(rootPath && rootPath !== this){
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
        if(!shouldBeSaved && this.shouldBeSaved && this.parent){
          this.parent.removeReference();
        }
      },
      () => `-> ${this.numReferencingPaths}`
    );
  }
}

function getPath(el, ignoreEl, isHardReferenced){
  return logFunc('path',
    `getPath ${el.tag}`,
    () => el.rootPath ? el.rootPath : calcPath(el, ignoreEl, isHardReferenced),
    result => `[ ${result.toString()} ]`
  );
}

function calcPath(el, ignoreEl, isHardReferenced){
  const { parent } = el;
  if(!parent) return new Path(el, true);
  if(ignoreEl) log('path', 'ignoreEl', ignoreEl.tag);

  const path = new Path(el, isHardReferenced);
  const { distFromEnd, index, previousSibling, nextSibling } = el;
  let parentPath;

  if(index === 0){
    parentPath = (
      ignoreEl === nextSibling
        ? getPath(parent)
        : Path.min(getPath(parent), getPath(nextSibling, el))
    );
  }
  else if(distFromEnd === 0){
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
  ){
    parentPath = getPath(nextSibling, el);
  }
  else {
    parentPath = getPath(previousSibling, el);
  }

  path.parent = parentPath;
  return path;
}

// Determine the relationship from one element to another (ex. parent, next sibling, previous sibling)
function getElementRelationshipTo(el, otherEl){
  return (
      el === otherEl.firstChild      ? 'firstChild'
    : el === otherEl.lastChild       ? 'lastChild'
    : el === otherEl.nextSibling     ? 'nextSibling'
    : el === otherEl.previousSibling ? 'previousSibling'
    : 'UNKNOWN'
  );
}

function expressionForRelationOrAssign(t, relationOrAssign){
  return (
    typeof relationOrAssign === 'string'
      ? t.identifier(relationOrAssign)
      :  generateMemberExpression(t, relationOrAssign)
  );
}

function generateMemberExpression(t, { tmpVar, path }){
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

function getTmpVarForNode(t, savedNodesToTmpVarId, el){
  let tmpVar = savedNodesToTmpVarId.get(el);
  if(tmpVar) return tmpVar;

  tmpVar = tmpVarId(t, savedNodesToTmpVarId.size);
  savedNodesToTmpVarId.set(el, tmpVar);
  return tmpVar;
}

function generateSpecCreateCloneableDynamicPropCode(t, statements, path, savedNodesToTmpVarId){
  let el, parentEl;
  let rootAssignExpr, curAssignExpr, pathMembers;
  const originalSavedNodes = new Set(savedNodesToTmpVarId.keys());

  while(path.parent && !originalSavedNodes.has(el = path.el)){
    parentEl = path.parent.el;
    pathMembers = [
      ...(savedNodesToTmpVarId.has(parentEl) ? [ savedNodesToTmpVarId.get(parentEl).name ] : EMPTY_ARRAY),
      getElementRelationshipTo(el, parentEl)
    ]

    // Optimization: Inline the assignment of the saved nodes in the member expression
    //               to the dynamic node
    if(!originalSavedNodes.has(el) && path.shouldBeSaved){
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

  // log('dynamicsPath', JSON.stringify(rootAssignExpr, null, 2));
  // log('dynamicsPath', generateMemberExpression(t, rootAssignExpr));
  statements.push(
    t.expressionStatement(
      generateMemberExpression(t, rootAssignExpr)
    )
  )
}

function generateSpecCreateCloneableDynamicCode(context, rootEl, rootElId, dynamics){
  const { statements, t, tmpVars } = context;
  const savedNodesToTmpVarId = new Map();
  const sortedDynamics = sortDynamicsByDepthThenDistanceFromEnds(dynamics);

  getTmpVarForNode(t, savedNodesToTmpVarId, rootEl);

  // Calculate shortest paths
  sortedDynamics.forEach(d => {
    getPath(d.el, undefined, true).finalize();
  });
  sortedDynamics.forEach(d => {
    // TODO: Handle dynamic children
    if(d.type !== PROP_EL) return;

    // Generate member expression for path
    // pathToExpression(t, d.el.rootPath);
    log('dynamicsPath', '');
    log('dynamicsPath', d.el.rootPath.toString());

    // pathToExpression(t, d.el.rootPath, savedNodesToTmpVarId);
    generateSpecCreateCloneableDynamicPropCode(t, statements, d.el.rootPath, savedNodesToTmpVarId);
  });

  for(let [, tmpVarId] of savedNodesToTmpVarId.entries()){
    tmpVars.push(
      t.variableDeclarator(
        tmpVarId
      )
    );
  }

  // Assign closest paths to root
  // sortedDynamics.forEach(d => {
  //   // TODO: Handle dynamic children
  //   if(d.type !== PROP_EL) return;

  //   context.statements.push(
  //     t.expressionStatement(
  //       t.assignmentExpression(
  //         '=',
  //         t.memberExpression(context.instId, d.instanceContextId),
  //         pathToExpression(t, [rootElId, ...getPath(d.el)])
  //       )
  //     )
  //   );

  //   generateAssignDynamicProp(
  //     context,
  //     pathToExpression(t, [rootElId, ...getPath(d.el)]),
  //     d.prop
  //   );
  // });
}

function generateSpecCreateCloneableElementCode(context, el, cloneable/* cloneable */, dynamics){
  const { t, tmpVars, xvdomApi } = context;
  const rootElId = tmpVarId(t, 0);
  const specNodeId = xvdomApi.definePrefixed('xvdomSpecNode', t.nullLiteral()).uniqueNameId;
  const createSpecContext =
    Object.assign({}, context, {
      statements:[], tmpVars:[], shouldGeneratePropsCode: false
    });

  // function _xvdomSpecNodeCreate(){
  //   ...
  // }
  generateSpecCreateElementCode(createSpecContext, el, 0);

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

function generateSpecCreateElementCode(context, el){
  if(el.type === 'el') generateSpecCreateHTMLElementCode(context, el, 0);
  else generateSpecCreateComponentCode(context, el, 0);
}

function generateSpecCreateCode(t, xvdomApi, { rootElement, dynamics, hasComponents, cloneable }){
  const context = {
    t,
    xvdomApi,
    shouldGeneratePropsCode: true,
    instId: instParamId(t),
    tmpVars: [],
    statements: []
  };

  if(cloneable) generateSpecCreateCloneableElementCode(context, rootElement, cloneable, dynamics);
  else generateSpecCreateElementCode(context, rootElement);

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
    componentsWithDyanmicProps.map(component =>
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

function generateInstanceCode(t, xvdomApi, { dynamics, key }, id){
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

/*
type ElementProp {
  isDynamic: boolean,
  nameId: Identifier,
  valueNode: Node
}
*/
function parseElementProps({ t, file, context }, node, nodeAttributes)/*:ElementProp[]*/{
  return nodeAttributes.reduce((props, attr) => {
    if(isXvdomAttribute(attr)) return props;

    const valueNode = normalizeElementPropValue(t, attr.value);
    const name      = attr.name.name;
    const nameId    = t.identifier(name);
    const isDynamic = isDynamicNode(t, valueNode);
    const prop      = {
      isDynamic,
      nameId,
      valueNode
    };

    prop.dynamic = isDynamic && context.addDynamicProp(node, prop, nameId, valueNode, hasSideEffects(node.tag, name))
    props.push(prop);
    return props;
  }, []);
}

/*
type ElementChild {
  isDynamic: boolean,
  node: Node
}
*/
function parseElementChild({ t, file, context }, childNode, parent, depth, isOnlyChild, index)/*:ElementChild*/{
  const isDynamic = isDynamicNode(t, childNode);
  return {
    index,
    depth,
    isOnlyChild,
    distFromEnd: (parent.children && (parent.children.length - index - 1)),
    type:        isDynamic ? NODE_DYNAMIC : NODE_STATIC,
    dynamic:     isDynamic && context.addDynamicChild(parent, childNode, isOnlyChild),
    node:        childNode
  };
}

/*
type Element {
  props: ElementProp[],
  children: (Element|ElementChild)[]
}
*/
function parseElement({ t, file, context }, { openingElement: { name, attributes }, children }, parent, depth, index, distFromEnd)/*:Element*/{
  const isComponent      = isComponentName(name.name);
  const filteredChildren = buildChildren(t, children);
  const numChildren      = filteredChildren.length;
  const hasOnlyOneChild  = numChildren === 1;
  const el = {
    parent,
    index,
    depth,
    distFromEnd,
    get nextSibling(){ return parent.children[index + 1] },
    get previousSibling(){ return parent.children[index - 1] },
    type: isComponent ? NODE_COMPONENT : NODE_EL,
    tag:  name.name
  };
  el.props = parseElementProps(context, el, attributes);

  const childDepth = depth + 1;
  let numDynamicDescendants = 0;
  
  el.children = isComponent
    ? EMPTY_ARRAY
    : filteredChildren.map((child, childIndex) => {
      let parsedChild;
      if(t.isJSXElement(child)){
        parsedChild = parseElement(context, child, el, childDepth, childIndex, numChildren - childIndex - 1);
        if(parsedChild.hasDynamicProps) ++numDynamicDescendants;
        numDynamicDescendants += parsedChild.numDynamicDescendants;
      }
      else{
        parsedChild = parseElementChild(context, child, el, childDepth, hasOnlyOneChild, childIndex, numChildren - childIndex - 1);
        if(parsedChild.dynamic) ++numDynamicDescendants;
      }
      return parsedChild;
    });
  el.hasDynamicProps = el.props.some(p => p.dynamic);
  el.numDynamicDescendants = numDynamicDescendants;
  el.firstChild = el.children[0];
  el.lastChild = el.children[el.children.length - 1];

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

  addDynamicChild(parent, childNode, isOnlyChild)/*:{type:String, value:Node, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    return this._addDynamic({
      parent,
      type:              'child',
      value:             childNode,
      instanceContextId: this._generateInstanceParamId(),
      instanceValueId:   this._generateInstanceParamId(),
      isOnlyChild
    });
  }

  addDynamicProp(el, prop, name, value, hasSideEffects)/*:{type:String, name:String, value:Node, hasSideEffects:Boolean, instanceContextId:Identifier, instanceValueId:Identifier}*/{
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

function parseKeyProp(t, { attributes }){
  const keyAttr = attributes.find(isKeyAttribute);
  if(keyAttr) return normalizeElementPropValue(t, keyAttr.value);
}

function parseTemplate(t, file, node)/*:{id:Identifier, root:Element}*/{
  const context = new ParsingContext(t, file);
  const { openingElement } = node;
  const isCloneable = openingElement.attributes.some(isCloneableAttribute);
  return {
    key: parseKeyProp(t, openingElement),
    rootElement: parseElement(context, node, null, 0, 0, 0),
    dynamics: context.dynamics,
    componentsWithDyanmicProps: Array.from(context.componentsWithDyanmicProps.keys()),
    hasComponents: context.hasComponents,
    cloneable: isCloneable
  };
}

module.exports = ({ types: t }) => ({
  visitor: {
    JSXElement: {
      exit(path, { file }){
        if(t.isJSX(path.parent)) return;

        const template = parseTemplate(t, file, path.node);
        const { instanceCode } = generateRenderingCode(t, file, template);
        path.replaceWith(instanceCode);
      }
    },
    Program: {
      exit(path, { file }){
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
