import {
  buildChildren,
  toReference
} from "./helpers";

function isComponentName(name){
  return /[A-Z]/.test(name[0]);
}

function hasDynamicComponentProps(t, props){
  return props && Object.keys(props).some(prop=>isDynamic(t, props[prop]));
}

function isDynamic(t, astNode){
  if(t.isIdentifier(astNode) || t.isCallExpression(astNode)){
    return true;
  }
  else if(t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)){
    return isDynamic(t, astNode.left) || isDynamic(t, astNode.right);
  }
  else if(t.isUnaryExpression(astNode)){
    return isDynamic(t, astNode.argument);
  }
  return false;
}

function objProp(t, key, value){
  key = t.isIdentifier(key) ? key : t.identifier(key);
  return t.property("init", key, value);
}

function transformProp(t, prop){
  return (
      t.isJSXExpressionContainer(prop) ? transformProp(t, prop.expression)
    : t.isJSXEmptyExpression(prop)     ? null
    : (t.isIdentifier(prop)
        || t.isMemberExpression(prop)) ? toReference(t, prop)
    : prop == null                     ? t.literal(true)
    : prop
  );
}

function createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props){
  if(!props) return [];

  // >>> _n.prop1 = prop1Value;
  // >>> _n.prop2 = prop2Value;
  // >>> ...
  return Object.keys(props).map(prop=>{
    const value = props[prop];
    const rhs = !isDynamic(t, value) ? value
                  : t.memberExpression(instanceParamId, genDynamicIdentifiers(value, prop).valueId);

    return t.expressionStatement(
      t.assignmentExpression("=",
        t.memberExpression(nodeId, t.identifier(prop)),
        rhs
      )
    );
  });
}

function createComponentCode(t, elCompName, props, instanceParamId, dynamicIds){
  const componentPropMap = dynamicIds.componentPropMap;
  const objProps = Object.keys(props).map(prop=>
    objProp(t, prop,
      (isDynamic(t, props[prop]) ? t.memberExpression(instanceParamId, componentPropMap[prop].id) : props[prop])
    )
  );

  // >>> xvdom.createComponent(MyComponent, props, )
  return t.callExpression(
    t.memberExpression(t.identifier("xvdom"), t.identifier("createComponent")),
    [
      t.identifier(elCompName),
      (objProps.length ? t.objectExpression(objProps) : t.literal(null)),
      instanceParamId,
      t.literal(dynamicIds.rerenderId.name),
      t.literal(dynamicIds.contextId.name),
      t.literal(dynamicIds.componentId.name)
    ]
  );
}

function createElementsCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, parentId, children){
  const result = {variableDeclarators:[], statements:[]};
  if(!children) return result;

  let tmpNodeId;
  return children.reduce(
    (acc, child)=>{
      let createEl;
      if(t.isJSXElement(child)){
        const {el, props, children} = child.openingElement.__xvdom_desc;
        const hasProps              = props    && Object.keys(props).length;
        const hasChildren           = children && children.length;
        const isComponent           = isComponentName(el);

        // >>> document.createElement("div")
        if(isComponent){
          createEl = createComponentCode(t, el, props, instanceParamId,
                        genDynamicIdentifiers(null, null, el, props)
                     );
        }
        else{
          createEl = t.callExpression(
            t.memberExpression(t.identifier("document"), t.identifier("createElement")),
            [t.literal(el)]
          );
        }

        if(hasProps || hasChildren){
          if(!tmpNodeId){
            tmpNodeId = genUidIdentifier();
            acc.variableDeclarators.push(tmpNodeId);
          }

          acc.statements.push(
            // >>> _n = document.createElement("div")
            t.expressionStatement(t.assignmentExpression("=", tmpNodeId, createEl))
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
        const {valueId, rerenderId, contextId} = genDynamicIdentifiers(child);

        // >>> xvdom.createDynamic(inst.v0, inst, "r0", "c0");
        createEl = t.callExpression(
          t.memberExpression(t.identifier("xvdom"), t.identifier("createDynamic")),
          [
            t.memberExpression(instanceParamId, valueId),
            instanceParamId,
            t.literal(rerenderId.name),
            t.literal(contextId.name)
          ]
        );
      }
      else{
        createEl = t.callExpression(
          t.memberExpression(t.identifier("document"), t.identifier("createTextNode")),
          [
            t.logicalExpression("||",
              t.sequenceExpression([child]),
              t.literal("")
            )
          ]
        );
      }

      acc.statements.push(
        // >>> parentNode.appendChild(...);
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(parentId, t.identifier("appendChild")),
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

  // >>> document.createElement("div")
  const createEl =
      isComponent ? createComponentCode(
        t, el, props, instanceParamId, genDynamicIdentifiers(null, null, el, props))
    : t.callExpression(
        t.memberExpression(t.identifier("document"), t.identifier("createElement")),
        [t.literal(el)]
      );
  const propsStatements =
      isComponent ? []
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
  let lastUidInt   = 0;
  function genUidIdentifier(){
    return t.identifier(++lastUidInt === 1 ? "_n" : `_n${lastUidInt}`);
  }
  const instanceParamId = t.identifier("inst");
  const {variableDeclarators, statements} = createRootElementCode(t, instanceParamId, genUidIdentifier, genDynamicIdentifiers, rootElement);
  const params = genDynamicIdentifiers.dynamics.length ? [instanceParamId] : [];

  return t.functionExpression(null, params, t.blockStatement([
    t.variableDeclaration("var", variableDeclarators),
    ...statements,
    t.returnStatement(variableDeclarators[0].id)
  ]));
}

function binarify(t, expressions){
  return expressions.reduce(
    (prevExp, exp)=>t.binaryExpression("||", exp, prevExp),
    expressions.pop()
  );
}

function createRerenderStatementForComponent(t, dyn, instanceParamId, prevInstanceParamId){
  const componentPropMap = dyn.componentPropMap;
  const dynamicProps = Object.keys(dyn.componentPropMap)
                        .filter(prop=>isDynamic(t, dyn.componentPropMap[prop].value));

  if(!dynamicProps.length) return;

  // >>> if (inst.v0 !== pInst.v0) {
  return t.ifStatement(
    binarify(t, dynamicProps.map(prop=>
      t.logicalExpression(
        "!==",
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
              Object.keys(dyn.componentPropMap).map(prop=>{
                const {id, value} = componentPropMap[prop];
                return objProp(t, prop,
                  isDynamic(t, value) ? t.memberExpression(instanceParamId, id) : value
                );
              })
            ),
            t.identifier("null"),
            t.memberExpression(prevInstanceParamId, dyn.componentId),
            t.memberExpression(prevInstanceParamId, dyn.contextId),
            prevInstanceParamId,
            t.literal(dyn.rerenderId.name),
            t.literal(dyn.contextId.name),
            t.literal(dyn.componentId.name)
          ]
        )
      ),

      // >>> pInst.p0prop = inst.p0prop;
      ...dynamicProps.map(prop=>
        t.expressionStatement(
          t.assignmentExpression("=",
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
    t.logicalExpression(
      "!==",
      t.memberExpression(instanceParamId,     dyn.valueId),
      t.memberExpression(prevInstanceParamId, dyn.valueId)
    ),

    t.blockStatement([

      // >>> pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
      t.expressionStatement(
        dyn.prop
          ? t.assignmentExpression("=",
              t.memberExpression(t.memberExpression(prevInstanceParamId, dyn.contextId), t.identifier(dyn.prop)),
              t.memberExpression(instanceParamId, dyn.valueId)
            )
          : t.callExpression(
              t.memberExpression(prevInstanceParamId, dyn.rerenderId),
              [
                t.memberExpression(instanceParamId,     dyn.valueId),
                t.memberExpression(prevInstanceParamId, dyn.valueId),
                t.memberExpression(prevInstanceParamId, dyn.contextId),
                prevInstanceParamId,
                t.literal(dyn.rerenderId.name),
                t.literal(dyn.contextId.name)
              ]
            )
      ),

      // >>> pInst.v0 = inst.v0;
      t.expressionStatement(
        t.assignmentExpression("=",
          t.memberExpression(prevInstanceParamId, dyn.valueId),
          t.memberExpression(instanceParamId,     dyn.valueId)
        )
      )
    ])
  );
}

function createRerenderFunction(t, dynamics){
  const instanceParamId     = t.identifier("inst");
  const prevInstanceParamId = t.identifier("pInst");
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement(
    dynamics.reduce((statements, dyn)=>{
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
  const specId = file.scope.generateUidIdentifier("xvdomSpec");
  const specProperties = [
    objProp(t, "render", createRenderFunction(t, genDynamicIdentifiers, desc))
  ];
  const dynamics = genDynamicIdentifiers.dynamics.filter(dyn=>!dyn.isComponent || dyn.hasDynamicComponentProps);

  if(dynamics.length){
    specProperties.push(
      objProp(t, "rerender", createRerenderFunction(t, dynamics))
    );
  }

  file.path.unshiftContainer("body",
    t.variableDeclaration("var", [
      t.variableDeclarator(specId, t.objectExpression(specProperties))
    ])
  );
  return specId;
}

function genComponentPropIdentifierMap(t, props, idInt){
  if(!props) return null;

  let map = {};
  for(let prop in props){
    map = map || {};
    map[prop] = {id: t.identifier(`p${idInt}${prop}`), value: props[prop]};
  }
  return map;
}

function instancePropsForComponent(t, {componentId, componentPropMap}){
  return [
    objProp(t, componentId, t.identifier("null")),
    ...(
      !componentPropMap
        ? []
        : Object.keys(componentPropMap)
          .filter(prop=>isDynamic(t, componentPropMap[prop].value))
          .map(prop=>{
            const {id, value} = componentPropMap[prop];
            return objProp(t, id, value);
          })
    )
  ];
}

function createInstanceObject(t, file, desc){
  const nullId   = t.identifier("null");
  const dynamics = [];

  let lastDynamicUidInt = 0;
  function genDynamicIdentifiers(value, prop, componentName, componentProps){
    const idInt = lastDynamicUidInt++;
    const isComponent = !!componentName;
    const componentPropMap = genComponentPropIdentifierMap(t, componentProps, idInt);
    const _hasDynamicComponentProps = hasDynamicComponentProps(t, componentProps);
    const result = {
      prop,
      value,
      isComponent,
      componentName,
      componentPropMap,
      hasDynamicComponentProps: _hasDynamicComponentProps,
      valueId:     (isComponent ? null : t.identifier(`v${idInt}`)),
      rerenderId:  t.identifier(`r${idInt}`),
      contextId:   t.identifier(`c${idInt}`),
      componentId: t.identifier(`w${idInt}`)
    };
    dynamics.push(result);
    return result;
  }
  genDynamicIdentifiers.dynamics = dynamics;

  const specObject               = createSpecObject(t, file, genDynamicIdentifiers, desc);
  const instancePropsForDynamics = dynamics.reduce(
    (props, {isComponent, value, valueId, rerenderId, contextId, componentId, componentPropMap})=>[
      ...props,
      ...(valueId ? [objProp(t, valueId, value)] : []),
      objProp(t, rerenderId, nullId),
      objProp(t, contextId,  nullId),
      ...(isComponent ? instancePropsForComponent(t, {componentPropMap, componentId}) : [])
    ],
    []
  );

  const objectProps = [
    objProp(t, "spec",  specObject),
    objProp(t, "_node", t.identifier("null")),
    ...instancePropsForDynamics
  ];

  if(desc.key) objectProps.push(objProp(t, "key", desc.key));

  return t.objectExpression(objectProps);
}

export default function ({ Plugin, types:t }){
  return new Plugin("xvdom", {
    visitor: {
      JSXOpeningElement: {
        exit(node/*, parent, scope, file */){
          let key;
          const props = node.attributes.length && node.attributes.reduce(
            (props, attr)=>{
              const propName = attr.name.name;
              const value    = transformProp(t, attr.value);

              if(propName === "key"){
                key = value;
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
            props,
            el: node.name.name
          };
          return node;
        }
      },

      JSXClosingElement: {
        exit(){ return this.dangerouslyRemove(); }
      },

      JSXElement: {
        exit(node, parent, scope, file){
          const children = buildChildren(t, node.children);
          const desc     = node.openingElement.__xvdom_desc;
          desc.children  = children;

          if(t.isJSX(parent)) return node;
          return createInstanceObject(t, file, desc);
        }
      }
    }
  });
}
