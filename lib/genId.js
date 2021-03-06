'use strict';

exports.__esModule = true;

exports.default = function (num) {
  var transformNum = num;
  var result = '';
  var charsToUse = FIRST_CHARS;
  do {
    result += charsToUse[transformNum % charsToUse.length];
    transformNum = transformNum / charsToUse.length | 0;
    charsToUse = CHARS;
  } while (transformNum);
  return result;
};

var CHARS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
var FIRST_CHARS = CHARS.slice(10);