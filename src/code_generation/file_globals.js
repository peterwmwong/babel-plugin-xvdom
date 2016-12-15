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
    const globals = this.globals = {};
    this.t = t;
    this.definedPrefixCounts = {};
    this.getOrSet = (id, value) => globals[id] || (globals[id] = { value, name: file.scope.generateUidIdentifier(id) });
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