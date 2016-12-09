'use strict';

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
var LOGGING = {}
// path: true,
// dynamicsPath: true


// Determines the indentation for logging by the stack trace
;var stackLevel = function stackLevel() {
  try {
    throw new Error();
  } catch (e) {
    return Math.max(0, e.stack.split(/^ {4}at/mg).filter(function (a) {
      return !/logFunc/.test(a);
    }).length - 47);
  }
};

/*

Logs a message for specified category.

category - category of logging that can be turned on or off (see LOGGING)
...msgs  - strings   

log('category1', 'obj.name', obj.name);  

*/
var log = function log(cat) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  if (LOGGING[cat]) {
    var _console;

    (_console = console).log.apply(_console, [new Array(stackLevel()).join('  ')].concat(args));
  }
};

var logFunc = function logFunc(cat, methodName, fn) {
  var outroMsg = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {
    return '';
  };

  log(cat, '> ' + methodName);
  var result = fn();
  log(cat, '< ' + methodName + ' ' + outroMsg(result));
  return result;
};

module.exports = {
  LOGGING: LOGGING,
  log: log,
  logFunc: logFunc
};