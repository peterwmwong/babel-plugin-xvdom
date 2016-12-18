/*

Simple logging utility functions that provide:

- Nested logging indentation
- Categorized logging

Example -

log('category1', 'obj.name', obj.name);

function add(a, b){
  logFunc('category2',
    `add(${a}, ${b})`,
    () => {
      return a + b;
    },
    result => `Exiting add, returning ${result}`
  );
}

*/


// Determines which categories are logged 
const LOGGING = {
  // path: true,
  // dynamicsPath: true
}

// Determines the indentation for logging by the stack trace
const stackLevel = () => {
  try{ throw new Error(); }
  catch(e){
    return Math.max(
      0,
      e.stack
        .split(/^ {4}at/mg)
        .filter(a => !/logFunc/.test(a))
        .length - 45
    );
  }
}

/*

Logs a message for specified category.

category - category of logging that can be turned on or off (see LOGGING)
...msgs  - strings   

log('category1', 'obj.name', obj.name);  

*/
const log = (cat, ...args) => {
  if(LOGGING[cat]) console.log(new Array(stackLevel()).join('  '), ...args);
};

const logFunc = (cat, methodName, fn, outroMsg = () => '') => {
  log(cat, `> ${methodName}`);
  const result = fn();
  log(cat, `< ${methodName} ${outroMsg(result)}`);
  return result;
}

module.exports = {
  LOGGING,
  log,
  logFunc
};
