const memberExpr = require('./memberExpr.js');
const objProp = require('./obj_prop.js');

const EMPTY_ARRAY = [];

module.exports = class FunctionGenerator {
  constructor(t, fileGlobals) {
    this.t = t;
    this.fileGlobals = fileGlobals;
    this.tmpVars = [];
    this.statements = [];
    this.contextVars = new Set();
    this._instId = this.t.identifier('v');
  }

  accessAPI(name) {
    return this.fileGlobals.accessAPI(name);
  }

  definePrefixedGlobal(name, value) {
    return this.fileGlobals.definePrefixed(name, value).name;
  }

  getTmpVarId(i) {
    return this.t.identifier(`_n${ i ? i + 1 : '' }`);
  }

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
        this.addStatement(t.expressionStatement(t.assignmentExpression('=', this.getTmpVarId(i), value)));
      }
  }

  addStatement(stmt) {
    this.statements.push(stmt);
  }

  accessInstance() {
    return this._instId || (this._instId = this.t.identifier('v'));
  }

  accessContext(id) {
    this.contextVars.add(id);
    return id;
  }

  get code() {
    const { t, tmpVars, statements, _instId, contextVars } = this;
    const tmpVarDeclarators = [...(_instId ? [t.variableDeclarator(_instId, memberExpr(t, 'inst', 'v'))] : EMPTY_ARRAY), ...[...contextVars].map(id => t.variableDeclarator(id)), ...tmpVars.map((value, i) => t.variableDeclarator(this.getTmpVarId(i), value))];
    const firstTmpVar = this.getTmpVarId(0);

    return t.functionExpression(null, _instId ? [t.identifier('inst')] : EMPTY_ARRAY, t.blockStatement([t.variableDeclaration('var', tmpVarDeclarators), ...statements, ...(contextVars.size ? [t.expressionStatement(t.assignmentExpression('=', memberExpr(t, 'inst', 'c'), t.objectExpression([...contextVars].map(v => objProp(t, v, v, false, true)))))] : EMPTY_ARRAY), ...(_instId ? [t.expressionStatement(t.assignmentExpression('=', memberExpr(t, firstTmpVar, 'xvdom'), t.identifier('inst')))] : EMPTY_ARRAY), t.returnStatement(_instId ? t.assignmentExpression('=', memberExpr(t, 'inst', 'n'), firstTmpVar) : firstTmpVar)]));
  }
};