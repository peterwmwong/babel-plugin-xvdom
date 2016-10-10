
function createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props, elementName){
  if(!props) return [];
  let contextId;

  // >>> _n.prop1 = prop1Value;
  // >>> _n.prop2 = prop2Value;
  // >>> ...
  return Object.keys(props).reduce((acc, prop)=> {
    const value = props[prop];
    let dyn;
    const rhs = !isDynamic(t, value)
                  ? value
                  : t.memberExpression(
                      instanceParamId,
                      (dyn = genDynamicIdentifiers(value, prop, elementName, null, contextId)).valueId
                    );

    let assignStmt = t.expressionStatement(
      t.assignmentExpression('=',
        t.memberExpression(nodeId, t.identifier(prop)),
        rhs
      )
    );

    if(hasSideEffects(dyn)){
      assignStmt = t.ifStatement(
        t.binaryExpression(
          '!=',
          rhs,
          t.identifier('null')
        ),
        assignStmt
      );
    }

    return [
      ...acc,
      ...(
        (!contextId && dyn) ? (
          (contextId = dyn.contextId),
          [t.expressionStatement(
              t.assignmentExpression('=',
                t.memberExpression(instanceParamId, dyn.contextId),
                nodeId
              )
            )]
        ) : EMPTY_ARRAY
      ),
      assignStmt
    ];
  }, []);
}

// TODO[xvdom]: if there are NO dynamic props, call a specialized createComponent
//              that doesn't bother with rerendering functions or contexts.
function createComponentCode(t, elCompName, props, instanceParamId, dynamicIds){
  props = props || {};
  const componentPropMap = dynamicIds.componentPropMap;
  let hasDynamicsProps = false;
  const componentObjProps = Object.keys(props).map((prop)=> {
    if(isDynamic(t, props[prop])){
      hasDynamicsProps = true;
      return objProp(t, prop, t.memberExpression(instanceParamId, componentPropMap[prop].id));
    }

    return objProp(t, prop, props[prop])
  });

  // >>> _xvdomCreateComponent(MyComponent, MyComponent.state, props, instance, rerenderProp, contextProp, componentInstanceProp)
  const createCode = t.callExpression(
    dynamicIds.createComponentId,
    [
      t.identifier(elCompName),
      t.memberExpression(
        t.identifier(elCompName),
        t.identifier('state')
      ),
      (componentObjProps.length
        ? t.objectExpression(componentObjProps)
        : t.nullLiteral()
      ),
      instanceParamId
    ]
  );

  return (
    t.memberExpression(
      (!hasDynamicsProps
        ? createCode
        : t.assignmentExpression('=',
            t.memberExpression(
              instanceParamId,
              dynamicIds.componentId
            ),
            createCode
          )
      ),
      t.identifier('$n')
    )
  );
}

// TODO: global for `document.createElement`
function createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, parentId, children){
  const result = {variableDeclarators:[], statements:[]};
  if(!children) return result;

  let tmpNodeId;
  const isOnlyChild = children.length === 1;
  return children.reduce(
    (acc, child)=> {
      let createEl;
      if(t.isJSXElement(child)){
        const {el, props, children} = child.openingElement.__xvdom_desc;
        const hasProps              = props    && Object.keys(props).length;
        const hasChildren           = children && children.length;
        const isComponent           = isComponentName(el);

        // >>> document.createElement('div')
        if(isComponent){
          createEl = createComponentCode(t, el, props, instanceParamId,
                        genDynamicIdentifiers(null, null, el, props, 'PREVENT')
                     );
        }
        else{
          createEl = t.callExpression(
            genDynamicIdentifiers.globalGet('el'),
            [t.stringLiteral(el)]
          );
        }

        if(hasProps || hasChildren){
          if(!tmpNodeId){
            tmpNodeId = genUidIdentifier();
            acc.variableDeclarators.push(
              t.variableDeclarator(tmpNodeId)
            );
          }

          acc.statements.push(
            // >>> _n = document.createElement('div')
            t.expressionStatement(t.assignmentExpression('=', tmpNodeId, createEl))
          );
          createEl = tmpNodeId;

          if(!isComponent && hasProps){
            acc.statements.push(
              ...createPropsStatements(t, instanceParamId, genDynamicIdentifiers, tmpNodeId, props, el)
            );
          }

          if(hasChildren){
            const {
              variableDeclarators,
              statements
            } = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, tmpNodeId, children);

            acc.variableDeclarators.push(...variableDeclarators);
            acc.statements.push(...statements);
          }
        }
      }
      else if(isDynamic(t, child)){
        const {valueId, rerenderId, contextId, createDynamicId} = genDynamicIdentifiers(
          child,
          null/*prop*/,
          null/*componentName*/,
          null/*componentProps*/,
          null/*contextId*/,
          isOnlyChild,
          true
        );

        // >>> xvdom.createDynamic(inst.v0, inst, 'r0', 'c0');
        createEl =  t.assignmentExpression('=',
          t.memberExpression(instanceParamId, contextId),
          t.callExpression(
            createDynamicId,
            [
              t.booleanLiteral(isOnlyChild),
              parentId,
              t.memberExpression(instanceParamId, valueId)
            ]
          )
        )
      }
      else{
        createEl = t.callExpression(
          t.memberExpression(t.identifier('document'), t.identifier('createTextNode')),
          [
            t.logicalExpression('||',
              t.sequenceExpression([child]),
              t.stringLiteral('')
            )
          ]
        );
      }

      acc.statements.push(
        // >>> parentNode.appendChild(...);
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(parentId, t.identifier('appendChild')),
            [createEl]
          )
        )
      );
      return acc;
    },
    result
  );
}

// TODO: Consolidate createRootElementCode and createElementsCode
function createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, {el, props, children}){
  const nodeId      = genUidIdentifier();
  const isComponent = isComponentName(el);

  // >>> document.createElement('div')
  const createEl =
      isComponent
        ? createComponentCode(
            t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props, 'PREVENT'))
        : t.callExpression(
            genDynamicIdentifiers.globalGet('el'),
            [t.stringLiteral(el)]
          );
  const propsStatements =
      isComponent
        ? EMPTY_ARRAY
        : createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props, el);

  const {
    variableDeclarators,
    statements
  } = createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, nodeId, children);

  return {
    variableDeclarators: [
      t.variableDeclarator(nodeId, createEl),
      ...variableDeclarators
    ],
    statements: [
      ...propsStatements,
      ...statements
    ]
  };
}

function createRenderFunction(t, genDynamicIdentifiers, rootElement){
  let lastUidInt = 0;
  const instanceParamId = t.identifier('inst');
  const genUidIdentifier = ()=>
    t.identifier(`_n${++lastUidInt === 1 ? '' : lastUidInt}`);
  const {
    variableDeclarators,
    statements
  } = createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, rootElement);
  const params = genDynamicIdentifiers.dynamics.length ? [instanceParamId] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([
    t.variableDeclaration('var', variableDeclarators),
    ...statements,
    t.returnStatement(variableDeclarators[0].id)
  ]));
}

function binarify(t, expressions){
  return expressions.reduce(
    (prevExp, exp)=> t.logicalExpression('||', exp, prevExp),
    expressions.pop()
  );
}

function createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId, genDynamicIdentifiers){
  const componentPropMap = dyn.componentPropMap;
  const componentPropKeys = Object.keys(dyn.componentPropMap)
  const dynamicProps = componentPropKeys.filter((prop)=> isDynamic(t, dyn.componentPropMap[prop].value));

  if(!dynamicProps.length) return;

  // >>> if (inst.v0 !== pInst.v0) {
  return t.ifStatement(
    binarify(t, dynamicProps.map((prop)=>
      t.binaryExpression(
        '!==',
        t.memberExpression(instanceParamId,     componentPropMap[prop].id),
        t.memberExpression(prevInstanceParamId, componentPropMap[prop].id)
      )
    )),

    t.blockStatement([
      t.expressionStatement(
        t.assignmentExpression('=',
          t.memberExpression(prevInstanceParamId, dyn.componentId),
          t.callExpression(
            genDynamicIdentifiers.globalGet('updateComponent'),
            [
              t.identifier(dyn.componentName),
              t.memberExpression(t.identifier(dyn.componentName), t.identifier('state')),
              t.objectExpression(
                componentPropKeys.map((prop)=> {
                  const {id, value} = componentPropMap[prop];
                  return objProp(t, prop,
                    isDynamic(t, value) ? (
                      t.assignmentExpression('=',
                        t.memberExpression(prevInstanceParamId, id),
                        t.memberExpression(instanceParamId, id)
                      )
                    ) : value
                  );
                })
              ),
              t.memberExpression(prevInstanceParamId, dyn.componentId)
            ]
          )
        )
      )
    ])
  );
}

function createPropAssignmentStatement(t, prevInstanceParamId, tempVarId, dyn){
  const assignStmt = t.expressionStatement(
    t.assignmentExpression('=',
      t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)),
      tempVarId
    )
  );

  if(hasSideEffects(dyn)){
    return t.ifStatement(
      t.binaryExpression(
        '!==',
        t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)),
        tempVarId
      ),
      t.blockStatement([assignStmt])
    )
  }
  else {
    return assignStmt;
  }
}

function createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId, tempVarId){
  return [
    ...(dyn.prop ? [t.expressionStatement(
      t.assignmentExpression('=',
        tempVarId,
        t.memberExpression(instanceParamId, dyn.valueId)
      )
    )] : []),

    // >>> if (inst.v0 !== pInst.v0) {
    t.ifStatement(
      t.binaryExpression(
        '!==',
        (dyn.prop ? tempVarId : t.memberExpression(instanceParamId, dyn.valueId)),
        t.memberExpression(prevInstanceParamId, dyn.valueId)
      ),

      t.blockStatement(
        dyn.prop ? [
          createPropAssignmentStatement(t, prevInstanceParamId, tempVarId, dyn),

          // >>> pInst.v0 = inst.v0;
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(prevInstanceParamId, dyn.valueId),
              tempVarId
            )
          )
        ] : [
          // >>> pInst.context = _xvdomUpdateDynamic(isOnlyChild, pInst.value, (pInst.value = inst.value), pInst.context);
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(prevInstanceParamId, dyn.contextId),
              t.callExpression(
                dyn.updateDynamicId,
                [
                  t.booleanLiteral(dyn.isOnlyChild),
                  t.memberExpression(prevInstanceParamId, dyn.valueId),
                  t.assignmentExpression('=',
                    t.memberExpression(prevInstanceParamId, dyn.valueId),
                    t.memberExpression(instanceParamId,     dyn.valueId)
                  ),
                  t.memberExpression(prevInstanceParamId, dyn.contextId)
                ]
              )
            )
          )
        ]
      )
    )
  ];
}

function createRerenderFunction(t, dynamics, genDynamicIdentifiers){
  const instanceParamId     = t.identifier('inst');
  const prevInstanceParamId = t.identifier('pInst');
  const tempVarId           = t.identifier('v');
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement([
    t.variableDeclaration('var', [
      t.variableDeclarator(tempVarId)
    ]),
    ...dynamics.reduce((acc, dyn)=> [
      ...acc,
      ...(dyn.isComponent
        ? [createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId, genDynamicIdentifiers)]
        : createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId, tempVarId))
    ], [])
  ]));
}

function createSpecObject(t, file, genDynamicIdentifiers, desc){
  const specId = file.scope.generateUidIdentifier('xvdomSpec');
  const xvdomId = t.identifier('xvdom');
  const renderFunc = createRenderFunction(t, genDynamicIdentifiers, desc);
  const dynamics = genDynamicIdentifiers.dynamics.filter((dyn)=>
                     !dyn.isComponent || dyn.hasDynamicComponentProps
                   );

  const specProperties = objProps(t, {
    c: renderFunc,
    u: dynamics.length
        ? createRerenderFunction(t, dynamics, genDynamicIdentifiers)
        : t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY)),
    r: desc.recycle
        ? t.newExpression(
            t.memberExpression(xvdomId, t.identifier('Pool')),
            EMPTY_ARRAY
          )
        : t.memberExpression(xvdomId, t.identifier('DEADPOOL'))
  });

  file.path.unshiftContainer('body',
    t.variableDeclaration('var', [
      t.variableDeclarator(
        specId,
        t.objectExpression(specProperties)
      )
    ])
  );
  return specId;
}

function getComponentDescriptor(t, props, idInt){
  let nextIdInt = idInt;
  let componentPropMap;
  let numDynamicProps = 0;

  if(props){
    componentPropMap = {};
    for(let prop in props){
      if(isDynamic(t, props[prop])){
        ++numDynamicProps;
        componentPropMap[prop] = {id: t.identifier(genId(nextIdInt++)), value: props[prop]}
      }
      else {
        componentPropMap[prop] = {value: props[prop]}
      }
    }
  }
  return {numDynamicProps, componentPropMap};
}

function instancePropsForComponent(t, {componentPropMap}){
  return !componentPropMap
    ? EMPTY_ARRAY
    : Object.keys(componentPropMap)
      .filter((prop)=> isDynamic(t, componentPropMap[prop].value))
      .map((prop)=> {
        const {id, value} = componentPropMap[prop];
        return objProp(t, id, value);
      });
}

function createInstanceObject(t, file, desc){
  let lastDynamicUidInt = 0;

  // TODO: Split up genDynamicIdentifiers:
  //        - dynamicIdGenerator.generateForProp(prop)
  //        - dynamicIdGenerator.generateForDynamic(value, isOnlyChild)
  //        - dynamicIdGenerator.generateForComponent(componentName, componentProps)
  function genDynamicIdentifiers(value, prop, componentName, componentProps, contextId, isOnlyChild){
    const isComponent = isComponentName(componentName);
    const {
      componentPropMap,
      numDynamicProps
    } = getComponentDescriptor(t, componentProps, lastDynamicUidInt);
    lastDynamicUidInt += numDynamicProps;
    const hasDynamicComponentProps = !!numDynamicProps;

    const result = {
      isOnlyChild,
      prop,
      value,
      isComponent,
      componentName,
      hasDynamicComponentProps,
      get createDynamicId(){
        return globals.get(file, 'createDynamic');
      },
      get updateDynamicId(){
        return globals.get(file, 'updateDynamic');
      },
      get createComponentId(){
        return globals.get(file, 'createComponent');
      },
      componentPropMap:         componentPropMap,
      valueId:                  (!isComponent && t.identifier(genId(lastDynamicUidInt++))),
      contextId:                ( contextId   || t.identifier(genId(lastDynamicUidInt++))),
      componentId:              ( isComponent && t.identifier(genId(lastDynamicUidInt++)))
    };
    genDynamicIdentifiers.dynamics.push(result);
    return result;
  }
  genDynamicIdentifiers.globalGet = (name)=> globals.get(file, name);
  genDynamicIdentifiers.dynamics = [];

  const specObject     = createSpecObject(t, file, genDynamicIdentifiers, desc);
  const instancePropsForDynamics = genDynamicIdentifiers.dynamics.reduce(
    (props, {isComponent, value, valueId, componentId, componentPropMap})=> [
      ...props,
      ...(valueId ? [objProp(t, valueId, value)] : EMPTY_ARRAY),
      ...(isComponent ? instancePropsForComponent(t, {componentPropMap, componentId}) : EMPTY_ARRAY)
    ],
    []
  );

  const objectProps = [
    objProp(t, '$s', specObject),
    ...instancePropsForDynamics
  ];

  if(desc.key) objectProps.push(objProp(t, 'key', desc.key));

  return t.objectExpression(objectProps);
}
