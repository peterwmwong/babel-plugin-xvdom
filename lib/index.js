const {
  JSXFragment
} = require('./parsing/JSXFragment.js');

const FileGlobals = require('./code_generation/file_globals.js');
const fragmentCode = require('./code_generation/fragment.js');
const fragmentInstanceCode = require('./code_generation/fragment_instance.js');
const fragmentValuesCode = require('./code_generation/fragment_values.js');

module.exports = ({ types: t }) => ({
  visitor: {
    JSXElement: {
      exit(path, { file }) {
        if (t.isJSX(path.parent)) return;

        const fileGlobals = FileGlobals.forFile(t, file);
        const frag = new JSXFragment(t, path.node);
        const fragGlobal = fileGlobals.definePrefixed('xvdomSpec', t.nullLiteral());
        const fragNameId = fragGlobal.name;
        const fragPrefix = /xvdomSpec(\d*)/.exec(fragNameId.name)[1];

        const valuesHeadId = fileGlobals.definePrefixed(`xvdomSpec${ fragPrefix }ValuesHead`, t.nullLiteral()).name;
        const valuesFnCode = fragmentValuesCode(t, valuesHeadId, frag.dynamics);
        const valuesFnId = fileGlobals.definePrefixed(`xvdomSpec${ fragPrefix }Values`, valuesFnCode).name;

        fragGlobal.value = fragmentCode(t, fileGlobals, frag, valuesHeadId);
        const instanceCode = fragmentInstanceCode(t, fileGlobals, valuesFnId, frag, fragNameId);

        path.replaceWith(instanceCode);
      }
    },

    Program: {
      exit(path, { file }) {
        const fileGlobals = FileGlobals.forFile(t, file);
        const declarators = fileGlobals.variableDeclarators;
        if (declarators.length) {
          file.path.unshiftContainer('body', t.variableDeclaration('var', declarators));
        }
      }
    }
  }
});