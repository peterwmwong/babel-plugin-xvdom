const {
  DynamicChild,
  DynamicProp,
  JSXHTMLElement
} = require('../parsing/JSXFragment.js');

const obj = require('./obj.js');
const memberExpr = require('./memberExpr.js');

const EMPTY_ARRAY = [];
const nonComponentPropDynamic = d => (d instanceof DynamicProp && d.el instanceof JSXHTMLElement) || d instanceof DynamicChild;
const instParamId             = t => t.identifier('inst');
const prevInstParamId         = t => t.identifier('pInst');

function dynamicPropStatements(t, xvdomApi, instId, pInstId, getTmpVar, dynamicProp) {
  const { instanceContextId, instanceValueId, astNameId, hasSideEffects } = dynamicProp;
  const tmpVar = getTmpVar();
  return [
    t.expressionStatement(
      t.assignmentExpression('=',
        tmpVar,
        memberExpr(t, instId, instanceValueId)
      )
    ),
    t.ifStatement(
      t.binaryExpression('!==',
        tmpVar,
        memberExpr(t, pInstId, instanceValueId)
      ),
      hasSideEffects ? t.blockStatement([
        t.ifStatement(
          t.binaryExpression('!==',
            memberExpr(t, pInstId, instanceContextId, astNameId),
            tmpVar
          ),
          t.expressionStatement(
            t.assignmentExpression('=',
              memberExpr(t, pInstId, instanceContextId, astNameId),
              tmpVar
            )
          )
        ),
        t.expressionStatement(
          t.assignmentExpression('=',
            memberExpr(t, pInstId, instanceValueId),
            tmpVar
          )
        )
      ]) : t.expressionStatement(
        t.assignmentExpression('=',
          memberExpr(t, pInstId, instanceContextId, astNameId),
          t.assignmentExpression('=',
            memberExpr(t, pInstId, instanceValueId),
            tmpVar
          )
        )
      )
    )
  ];
}

function dynamicArrayOrJSXChildStatement(t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild) {
  const { instanceContextId, instanceValueId, isOnlyChild } = dynamicChild;
  return (
    t.expressionStatement(
      t.assignmentExpression('=',
        memberExpr(t, pInstId, instanceContextId),
        t.callExpression(
          xvdomApi.accessAPI(`updateDynamic${isOnlyChild ? 'OnlyChild': ''}`),
          [
            memberExpr(t, pInstId, instanceValueId),
            t.assignmentExpression('=',
              memberExpr(t, pInstId, instanceValueId),
              memberExpr(t, instId, instanceValueId)
            ),
            memberExpr(t, pInstId, instanceContextId)
          ]
        )
      )
    )
  );
}

function dynamicTextChildStatements(t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild) {
  const { instanceContextId, instanceValueId, isOnlyChild } = dynamicChild;
  return (
    t.expressionStatement(
      t.assignmentExpression('=',
        (isOnlyChild
          ? memberExpr(t, pInstId, instanceContextId, 'innerText')
          : memberExpr(t, pInstId, instanceContextId, 'data')
        ),
        t.callExpression(
          xvdomApi.accessAPI(`text`),
          [
            t.assignmentExpression('=',
              memberExpr(t, pInstId, instanceValueId),
              memberExpr(t, instId, instanceValueId)
            )
          ]
        )
      )
    )
  );
}

function dynamicChildStatements(t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild) {
  const { instanceContextId, instanceValueId, isText } = dynamicChild;
  return [
    t.ifStatement(
      t.binaryExpression('!==',
        memberExpr(t, instId, instanceValueId),
        memberExpr(t, pInstId, instanceValueId)
      ),
      (isText ? dynamicTextChildStatements : dynamicArrayOrJSXChildStatement)(
        t, xvdomApi, instId, pInstId, getTmpVar, dynamicChild
      )
    )
  ];
}

function componentDynamicStatement(t, xvdomApi, instId, pInstId, component) {
  const dynamicProps = component.props.filter(p => p.dynamic);
  const condition = (
    dynamicProps.map(p => (
      t.binaryExpression(
        '!==',
        memberExpr(t, instId, p.dynamic.instanceValueId),
        memberExpr(t, pInstId, p.dynamic.instanceValueId)
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
          memberExpr(t, pInstId, component.instanceContextId),
          t.callExpression(
            xvdomApi.accessAPI('updateComponent'),
            [
              t.identifier(component.tag),
              memberExpr(t, component.tag, 'state'),
              obj(t, component.props.reduce((hash, p) => {
                hash[p.astNameId.name] = (
                  !p.dynamic ? p.astValueNode : (
                    t.assignmentExpression('=',
                      memberExpr(t, pInstId, p.dynamic.instanceValueId),
                      memberExpr(t, instId, p.dynamic.instanceValueId)
                    )
                  )
                );
                return hash;
              }, {})),
              memberExpr(t, pInstId, component.instanceContextId)
            ]
          )
        )
      )
    )
  );
}

module.exports = function(t, xvdomApi, { dynamics, customElementsWithDynamicProps }) {
  if(!dynamics.length) return t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY));

  const instId  = instParamId(t);
  const pInstId = prevInstParamId(t);
  let tmpVar;
  const getTmpVar = () => tmpVar || (tmpVar = t.identifier('v'));

  const updateDynamicPropCode = (
    dynamics
      .filter(nonComponentPropDynamic)
      .reduce((acc, dynamic) => [
        ...acc,
        ...(
          dynamic instanceof DynamicProp 
            ? dynamicPropStatements(t, xvdomApi, instId, pInstId, getTmpVar, dynamic)
            : dynamicChildStatements(t, xvdomApi, instId, pInstId, getTmpVar, dynamic)
        )
      ], [])
  );

  const updateDynamicComponents = (
    [...customElementsWithDynamicProps].map(component =>
      componentDynamicStatement(t, xvdomApi, instId, pInstId, component)
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
