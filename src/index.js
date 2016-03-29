import {
  buildChildren,
  toReference
} from './helpers';

import genId from './genId';

const EMPTY_ARRAY = [];

function isComponentName(name){
  return /^[A-Z]/.test(name);
}

function isDynamic(t, astNode){
  if(t.isLiteral(astNode)){
    return false;
  }
  else if(t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)){
    return isDynamic(t, astNode.left) || isDynamic(t, astNode.right);
  }
  else if(t.isUnaryExpression(astNode)){
    return isDynamic(t, astNode.argument);
  }
  return true;
}

function objProp(t, key, value){
  return t.objectProperty(
    (t.isIdentifier(key) ? key : t.identifier(key)),
    value
  );
}

function objProps(t, keyValues){
  return Object.keys(keyValues).map((key)=> objProp(t, key, keyValues[key]));
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

function createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props){
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
                      (dyn = genDynamicIdentifiers(value, prop, null, null, contextId)).valueId
                    );

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
      t.expressionStatement(
        t.assignmentExpression('=',
          t.memberExpression(nodeId, t.identifier(prop)),
          rhs
        )
      )
    ];
  }, []);
}

function createComponentCode(t, elCompName, props, instanceParamId, dynamicIds){
  props = props || {};
  const componentPropMap = dynamicIds.componentPropMap;
  const componentObjProps = Object.keys(props).map((prop)=>
    objProp(t, prop,
      (isDynamic(t, props[prop]) ? t.memberExpression(instanceParamId, componentPropMap[prop].id) : props[prop])
    )
  );

  // >>> xvdom.createComponent(MyComponent, props, )
  return t.callExpression(
    t.memberExpression(t.identifier('xvdom'), t.identifier('createComponent')),
    [
      t.identifier(elCompName),
      (componentObjProps.length
        ? t.objectExpression(componentObjProps)
        : t.nullLiteral()
      ),
      instanceParamId,
      t.stringLiteral(dynamicIds.rerenderId.name),
      t.stringLiteral(dynamicIds.contextId.name),
      t.stringLiteral(dynamicIds.componentId.name)
    ]
  );
}

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
                        genDynamicIdentifiers(null, null, el, props)
                     );
        }
        else{
          createEl = t.callExpression(
            t.memberExpression(t.identifier('document'), t.identifier('createElement')),
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
              ...createPropsStatements(t, instanceParamId, genDynamicIdentifiers, tmpNodeId, props)
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
        const {valueId, rerenderId, contextId} = genDynamicIdentifiers(
          child,
          null/*prop*/,
          null/*componentName*/,
          null/*componentProps*/,
          null/*contextId*/,
          isOnlyChild
        );

        // >>> xvdom.createDynamic(inst.v0, inst, 'r0', 'c0');
        createEl = t.callExpression(
          t.memberExpression(t.identifier('xvdom'), t.identifier('createDynamic')),
          [
            t.booleanLiteral(isOnlyChild),
            parentId,
            t.memberExpression(instanceParamId, valueId),
            instanceParamId,
            t.stringLiteral(rerenderId.name),
            t.stringLiteral(contextId.name)
          ]
        );
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

function createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, {el, props, children}){
  const nodeId      = genUidIdentifier();
  const isComponent = isComponentName(el);

  // >>> document.createElement('div')
  const createEl =
      isComponent
        ? createComponentCode(
            t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props))
        : t.callExpression(
            t.memberExpression(t.identifier('document'), t.identifier('createElement')),
            [t.stringLiteral(el)]
          );
  const propsStatements =
      isComponent
        ? EMPTY_ARRAY
        : createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props);

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

function createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId){
  const componentPropMap = dyn.componentPropMap;
  const dynamicProps = Object.keys(dyn.componentPropMap)
                        .filter((prop)=> isDynamic(t, dyn.componentPropMap[prop].value));

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
        t.callExpression(
          t.memberExpression(prevInstanceParamId, dyn.rerenderId),
          [
            t.identifier(dyn.componentName),
            t.objectExpression(
              Object.keys(dyn.componentPropMap).map((prop)=> {
                const {id, value} = componentPropMap[prop];
                return objProp(t, prop,
                  isDynamic(t, value) ? t.memberExpression(instanceParamId, id) : value
                );
              })
            ),
            t.nullLiteral(),
            t.memberExpression(prevInstanceParamId, dyn.componentId),
            t.memberExpression(prevInstanceParamId, dyn.contextId),
            prevInstanceParamId,
            t.stringLiteral(dyn.contextId.name),
            t.stringLiteral(dyn.componentId.name)
          ]
        )
      ),

      // >>> pInst.p0prop = inst.p0prop;
      ...dynamicProps.map((prop)=>
        t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(prevInstanceParamId, componentPropMap[prop].id),
            t.memberExpression(instanceParamId,     componentPropMap[prop].id)
          )
        )
      )
    ])
  );
}

function createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId){
  // >>> if (inst.v0 !== pInst.v0) {
  return t.ifStatement(
    t.binaryExpression(
      '!==',
      t.memberExpression(instanceParamId,     dyn.valueId),
      t.memberExpression(prevInstanceParamId, dyn.valueId)
    ),

    t.blockStatement(
      dyn.prop ? [
        t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)),
            t.memberExpression(instanceParamId, dyn.valueId)
          )
        ),

        // >>> pInst.v0 = inst.v0;
        t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(prevInstanceParamId, dyn.valueId),
            t.memberExpression(instanceParamId,     dyn.valueId)
          )
        )
      ] : [
        // >>> pInst.v0 = pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, 'r0', 'c0');
        t.expressionStatement(
          t.assignmentExpression('=',
            t.memberExpression(prevInstanceParamId, dyn.valueId),
            t.callExpression(
              t.memberExpression(prevInstanceParamId, dyn.rerenderId),
              [
                t.booleanLiteral(dyn.isOnlyChild),
                t.memberExpression(instanceParamId,     dyn.valueId),
                t.memberExpression(prevInstanceParamId, dyn.valueId),
                t.memberExpression(prevInstanceParamId, dyn.contextId),
                prevInstanceParamId,
                t.stringLiteral(dyn.rerenderId.name),
                t.stringLiteral(dyn.contextId.name)
              ]
            )
          )
        )
      ]
    )
  );
}

function createRerenderFunction(t, dynamics){
  const instanceParamId     = t.identifier('inst');
  const prevInstanceParamId = t.identifier('pInst');
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement(
    dynamics.reduce((statements, dyn)=> {
      return [
        ...statements,
        (dyn.isComponent
          ? createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId)
          : createRerenderStatementForDynamic(t, dyn, instanceParamId, prevInstanceParamId))
      ];
    }, [])
  ));
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
        ? createRerenderFunction(t, dynamics)
        : t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY)),
    r: desc.recycle
        ? t.callExpression(
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
    const isComponent = !!componentName;
    const {
      componentPropMap,
      numDynamicProps
    } = getComponentDescriptor(t, componentProps, lastDynamicUidInt);
    lastDynamicUidInt += numDynamicProps;

    const result = {
      isOnlyChild,
      prop,
      value,
      isComponent,
      componentName,
      componentPropMap:         componentPropMap,
      hasDynamicComponentProps: !!numDynamicProps,
      valueId:                  (!isComponent && t.identifier(genId(lastDynamicUidInt++))),
      rerenderId:               (!prop        && t.identifier(genId(lastDynamicUidInt++))),
      contextId:                ( contextId   || t.identifier(genId(lastDynamicUidInt++))),
      componentId:              ( isComponent && t.identifier(genId(lastDynamicUidInt++)))
    };
    genDynamicIdentifiers.dynamics.push(result);
    return result;
  }
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

export default function({types: t}){
  return {
    visitor: {
      JSXOpeningElement: {
        exit({node}/*, parent, scope, file */){
          let key;
          let recycle = false;
          const props = node.attributes.length && node.attributes.reduce(
            (props, attr)=> {
              const propName = attr.name.name;
              const value    = transformProp(t, attr.value);

              if(propName === 'key'){
                key = value;
              }
              else if(propName === 'recycle'){
                recycle = true;
              }
              else if(value != null){
                props[propName] = value;
              }

              return props;
            },
            {}
          );

          node.__xvdom_desc = {
            key,
            recycle,
            props,
            el: node.name.name
          };
        }
      },

      JSXClosingElement: {
        exit(path){ path.remove(); }
      },

      JSXElement: {
        exit(path, state){
          const node     = path.node;
          const children = buildChildren(t, node.children);
          const desc     = node.openingElement.__xvdom_desc;
          desc.children  = children;

          if(!t.isJSX(path.parent)){
            path.replaceWith(createInstanceObject(t, state.file, desc));
          }
        }
      }
    }
  };
}
