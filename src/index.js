const {
  JSXFragment
} = require('./parsing/JSXFragment.js'); 

const FileGlobals = require('./code_generation/file_globals.js');
const fragmentCode = require('./code_generation/fragment.js');
const fragmentInstanceCode = require('./code_generation/fragment_instance.js');

module.exports = ({ types: t }) => ({
  visitor: {
    JSXElement: {
      exit(path, { file }) {
        if(t.isJSX(path.parent)) return;

        const fileGlobals  = FileGlobals.forFile(t, file);
        const frag         = new JSXFragment(t, path.node);
        const fragCode     = fragmentCode(t, fileGlobals, frag);
        const fragName     = fileGlobals.definePrefixed('xvdomSpec', fragCode);
        const instanceCode = fragmentInstanceCode(t, frag, fragName);
        path.replaceWith(instanceCode);
      }
    },

    Program: {
      exit(path, { file }) {
        const fileGlobals = FileGlobals.forFile(t, file);
        const declarators = fileGlobals.variableDeclarators;
        if(declarators.length) {
          file.path.unshiftContainer('body', t.variableDeclaration('var', declarators));  
        }
      }
    }
  }
});
