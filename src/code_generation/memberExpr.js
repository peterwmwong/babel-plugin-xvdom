const idify = (t, id) => typeof id === 'string' ? t.identifier(id) : id;

const memberExpr = (t, ...arr) => {
  const tail = idify(t, arr.pop());
  return !arr.length ? tail : t.memberExpression(memberExpr(t, ...arr), tail);
};

module.exports = memberExpr;