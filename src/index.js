const {
  JSXFragment
} = require('./parsing/JSXFragment.js'); 

const generateSpecCreateCode = require('./code_generation/fragment_create.js');
const generateSpecUpdateCode = require('./code_generation/fragment_update.js');
const obj = require('./code_generation/obj.js');
const memberExpr = require('./code_generation/memberExpr.js');

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
    this.t = t;
    this.genUid = id => file.scope.generateUidIdentifier(id);
    this.definedPrefixCounts = {};
    this.globals = {};
  }

  definePrefixed(name, value) {
    const { definedPrefixCounts } = this;
    const count = definedPrefixCounts[name] = 1 + (definedPrefixCounts[name] || 0); 
    return this._getOrSet(`${name}${count > 1 ? count : ''}`, value);
  }

  accessAPI(apiFuncName) {
    const { t } = this;
    return this._getOrSet(
      apiVarName(apiFuncName),
      memberExpr(t, 'xvdom', apiFuncName)
    ).name;
  }

  _getOrSet(id, value) {
    return this.globals[id] || (this.globals[id] = { name: this.genUid(id), value });
  }
}

function generateInstanceCode(t, xvdomApi, { dynamics, key }, id) {
  return obj(t,
    dynamics.reduce(
      (acc, { instanceValueId, astValueNode }) => {
        acc[instanceValueId.name] = astValueNode;
        return acc;
      },
      Object.assign({ $s: id }, key && { key })
    )
  )
}

function generateRenderingCode(t, file, frag) {
  const xvdomApi = FileGlobals.forFile(t, file);
  const { name, value:specCode } = xvdomApi.definePrefixed('xvdomSpec',
    obj(t, {
      c: generateSpecCreateCode(t, xvdomApi, frag),
      u: generateSpecUpdateCode(t, xvdomApi, frag),
      r: memberExpr(t, 'xvdom', 'DEADPOOL')
    })
  );
  return { specCode, instanceCode: generateInstanceCode(t, xvdomApi, frag, name) };
}

module.exports = ({ types: t }) => ({
  visitor: {
    JSXElement: {
      exit(path, { file }) {
        if(t.isJSX(path.parent)) return;

        const { instanceCode } = generateRenderingCode(t, file, new JSXFragment(t, path.node));
        path.replaceWith(instanceCode);
      }
    },
    Program: {
      exit(path, { file }) {
        const { globals } = FileGlobals.forFile(t, file);
        const declarators = (
          Object.keys(globals)
            .sort()
            .map(key => t.variableDeclarator(globals[key].name, globals[key].value))
        );
          
        if(declarators.length) {
          file.path.unshiftContainer('body', t.variableDeclaration('var', declarators));  
        }
      }
    }
  }
});
