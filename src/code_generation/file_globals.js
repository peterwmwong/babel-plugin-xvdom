const memberExpr = require('./memberExpr.js');

const apiVarName = name => `xvdom${name[0].toUpperCase()}${name.slice(1)}`;

const globalsForFile = new WeakMap();

class FileGlobals {
  static forFile(t, file) {
    return (
      globalsForFile.get(file) || 
      globalsForFile.set(file, new FileGlobals(t, file)).get(file) 
    );
  }

  constructor(t, file) {
    this.globals = {};
    this.definedPrefixCounts = {};
    this.file = file;
    this.t = t;
  }

  getOrSet(id, value){
    const { globals } = this;
    return (
      globals[id] ||
      (globals[id] = { value, name: this.file.scope.generateUidIdentifier(id) })
    );
  }

  get variableDeclarators() {
    const { t } = this;
    return Object.keys(this.globals).sort().map(k => {
      const { name, value } = this.globals[k];
      return t.variableDeclarator(name, value);
    });
  }

  definePrefixed(name, value) {
    const { definedPrefixCounts } = this;
    const count = definedPrefixCounts[name] = 1 + (definedPrefixCounts[name] || 0); 
    return this.getOrSet(`${name}${count > 1 ? count : ''}`, value);
  }

  accessAPI(apiFuncName) {
    return this.getOrSet(
      apiVarName(apiFuncName),
      memberExpr(this.t, 'xvdom', apiFuncName)
    ).name;
  }
}

module.exports = FileGlobals;