const CHARS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const CHARS_LENGTH = CHARS.length;
const FIRST_CHARS = CHARS.slice(10);
const FIRST_CHARS_LENGTH = FIRST_CHARS.length;

module.exports = function (num) {
  let result = '';

  result += FIRST_CHARS[num % FIRST_CHARS_LENGTH];
  num = num / FIRST_CHARS_LENGTH | 0;

  while (num) {
    result += CHARS[num % CHARS_LENGTH];
    num = num / CHARS_LENGTH | 0;
  };
  return result;
};