const objProp = require('./obj_prop.js');

// module.exports = (t, fileGlobals, { dynamics, key }, fragId) => (
//   t.objectExpression([
//     objProp(t, 's', fragId),
//     ...(key ? [ objProp(t, 'key', key) ] : []),
//     ...(
//       !dynamics.length
//         ? []
//         : [objProp(t, 'v',
//             t.objectExpression(
//               dynamics.map(({ instanceValueId, astValueNode }) =>
//                 objProp(t, instanceValueId, astValueNode)
//               )
//             )
//           )]
//     ),
//     objProp(t, 'c', t.nullLiteral()),
//     objProp(t, 'n', t.nullLiteral())
//   ])
// );

module.exports = (t, fileGlobals, valuesFnId, { dynamics, key }, fragId) => (
  t.callExpression(fileGlobals.accessAPI('jsx'), [
    fragId,
    t.callExpression(
      valuesFnId,
      dynamics.map(({ astValueNode }) => astValueNode)
    )
  ])
);
