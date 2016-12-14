const {
  JSXFragment
} = require('./parsing/JSXFragment.js'); 

const generateSpecCreateCode = require('./code_generation/fragment_create.js');
const generateSpecUpdateCode = require('./code_generation/fragment_update.js');
const obj = require('./code_generation/obj.js');

const xvdomApiFuncName = name => `xvdom${name[0].toUpperCase()}${name.slice(1)}`;

const _fileGlobalForFile = new WeakMap();
class FileGlobals {
  static forFile(t, file) {
    return (
      _fileGlobalForFile.get(file) ||
        _fileGlobalForFile
          .set(file, new FileGlobals(t, file))
          .get(file)
    );
  }

  constructor(t, file) {
    this._t = t;
    this._file = file;
    this._definedPrefixCounts = new Map();
    this.globals = {};
  }

  definePrefixed(name, value) {
    const { _definedPrefixCounts } = this;
    const count = 1 + (_definedPrefixCounts.get(name) | 0);
    const globalId = count === 1 ? name : name + count;

    _definedPrefixCounts.set(name, count);
    return this.globals[globalId] = {
      uniqueNameId: this._file.scope.generateUidIdentifier(name),
      value
    };
  }

  accessFunction(apiFuncName) {
    const { _t } = this;
    const globalId = xvdomApiFuncName(apiFuncName);
    const global = this.globals[globalId];
    return (
      global ||
        (this.globals[globalId] = {
          uniqueNameId: this._file.scope.generateUidIdentifier(globalId),
          value: _t.memberExpression(_t.identifier('xvdom'), _t.identifier(apiFuncName))
        })
    ).uniqueNameId;
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
  const { uniqueNameId, value:specCode } = xvdomApi.definePrefixed('xvdomSpec',
    obj(t, {
      c: generateSpecCreateCode(t, xvdomApi, frag),
      u: generateSpecUpdateCode(t, xvdomApi, frag),
      r: t.memberExpression(t.identifier('xvdom'), t.identifier('DEADPOOL'))
    })
  );
  return {
    specCode,
    instanceCode: generateInstanceCode(t, xvdomApi, frag, uniqueNameId)
  }
}

module.exports = ({ types: t }) => ({
  visitor: {
    JSXElement: {
      exit(path, { file }) {
        if(t.isJSX(path.parent)) return;

        const template = new JSXFragment(t, path.node);
        const { instanceCode } = generateRenderingCode(t, file, template);
        path.replaceWith(instanceCode);
      }
    },
    Program: {
      exit(path, { file }) {
        const fileGlobals = FileGlobals.forFile(t, file).globals;
        const globalKeys = fileGlobals && Object.keys(fileGlobals);
        if(!globalKeys.length) return;

        file.path.unshiftContainer('body',
          t.variableDeclaration('var',
            globalKeys.sort().map(key => {
              const { uniqueNameId, value } = fileGlobals[key];
              return t.variableDeclarator(uniqueNameId, value);
            })
          )
        );
      }
    }
  }
});
