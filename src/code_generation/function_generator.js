const EMPTY_ARRAY = [];

module.exports = class FunctionGenerator {
  constructor(t, fileGlobals){
    this.t = t;
    this.fileGlobals = fileGlobals;
    this.tmpVars = [];
    this.statements = [];
  }

  accessAPI(name) {
    return this.fileGlobals.accessAPI(name);
  }

  definePrefixedGlobal(name, value) {
    return this.fileGlobals.definePrefixed(name, value);
  }

  getTmpVarId(i) {
    return this.t.identifier(`_n${i ? i+1 : ''}`);
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
      this.addStatement(
        t.expressionStatement(
          t.assignmentExpression('=', this.getTmpVarId(i), value)
        )
      );
    }
  }

  addStatement(stmt){ this.statements.push(stmt); }

  accessInstance(){
    return this._instId || (this._instId = this.t.identifier('inst'));
  }

  get code(){
    const { t, tmpVars, statements, _instId } = this;
    const tmpVarDeclarators = tmpVars.map((value, i) =>
      t.variableDeclarator(this.getTmpVarId(i), value)
    );

    return t.functionExpression(
      null,
      (_instId ? [_instId] : EMPTY_ARRAY),
      t.blockStatement([
        t.variableDeclaration('var', tmpVarDeclarators),
        ...statements,
        t.returnStatement(this.getTmpVarId(0))
      ])
    );
  }
}