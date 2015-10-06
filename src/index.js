import {
  buildChildren,
  toReference
} from "./helpers";

function isDynamic(t, astNode){
  return t.isIdentifier(astNode)
          || t.isBinaryExpression(astNode)
          || t.isCallExpression(astNode);
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

        // >>> document.createElement("div")
        createEl                    = t.callExpression(
          t.memberExpression(t.identifier("document"), t.identifier("createElement")),
          [t.literal(el)]
        );

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

          if(hasProps) acc.statements.push(...createPropsStatements(t, instanceParamId, genDynamicIdentifiers, tmpNodeId, props));

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
      else{
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
  const nodeId   = genUidIdentifier();

  // >>> document.createElement("div")
  const createEl = t.callExpression(
    t.memberExpression(t.identifier("document"), t.identifier("createElement")),
    [t.literal(el)]
  );
  const propsStatements = createPropsStatements(t, instanceParamId, genDynamicIdentifiers, nodeId, props);

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

function createRerenderFunction(t, dynamics){
  const instanceParamId     = t.identifier("inst");
  const prevInstanceParamId = t.identifier("pInst");
  return t.functionExpression(null, [instanceParamId, prevInstanceParamId], t.blockStatement(
    dynamics.reduce((statements, dyn)=>{
      return [
        ...statements,

        // >>> if (inst.v0 !== pInst.v0) {
        t.ifStatement(
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
        )
      ];
    }, [])
  ));
}

function createSpecObject(t, genDynamicIdentifiers, desc){
  const dynamics       = genDynamicIdentifiers.dynamics;
  const specProperties = [
    objProp(t, "render", createRenderFunction(t, genDynamicIdentifiers, desc))
  ];

  if(dynamics.length){
    specProperties.push(
      objProp(t, "rerender", createRerenderFunction(t, dynamics))
    );
  }

  return t.objectExpression(specProperties);
}

function createInstanceObject(t, scope, desc){
  const nullId   = t.identifier("null");
  const dynamics = [];

  let lastDynamicUidInt = 0;
  function genDynamicIdentifiers(value, prop){
    const idInt = lastDynamicUidInt++;
    const result = {
      prop,
      value,
      valueId:    t.identifier(`v${idInt}`),
      rerenderId: t.identifier(`r${idInt}`),
      contextId:  t.identifier(`c${idInt}`)
    };
    dynamics.push(result);
    return result;
  }
  genDynamicIdentifiers.dynamics = dynamics;

  const specObject               = createSpecObject(t, genDynamicIdentifiers, desc);
  const instancePropsForDynamics = dynamics.reduce(
    (props, {value, valueId, rerenderId, contextId})=>[
      ...props,
      objProp(t, valueId,    value),
      objProp(t, rerenderId, nullId),
      objProp(t, contextId,  nullId)
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

              if(propName === "key") key = value;
              else props[propName] = value;

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
        exit(node, parent, scope){
          const children = buildChildren(t, node.children);
          const desc     = node.openingElement.__xvdom_desc;
          desc.children  = children;

          if(t.isJSX(parent)) return node;
          return createInstanceObject(t, scope, desc);
        }
      }
    }
  });
}
