"use strict";

exports.__esModule = true;
exports.toReference = toReference;
exports.buildChildren = buildChildren;
var nonWhitespace = /\S/;
var newlines = /\r\n?|\n/;

// Trims the whitespace off the lines.
function lineFilter(lines, line, i, _ref) {
  var length = _ref.length;

  if (i > 0) {
    line = line.trimLeft();
  }
  if (i + 1 < length) {
    line = line.trimRight();
  }
  if (line) {
    lines.push(line);
  }

  return lines;
}

// Cleans the whitespace from a text node.
function cleanText(node) {
  if (!nonWhitespace.test(node.value)) {
    return "";
  }

  var lines = node.value.split(newlines);
  lines = lines.reduce(lineFilter, []);

  return lines.join(" ");
}

// Helper to transform a JSX identifier into a normal reference.

function toReference(t, node, identifier) {
  if (t.isIdentifier(node)) {
    return node;
  }
  if (t.isJSXIdentifier(node)) {
    return identifier ? t.identifier(node.name) : t.literal(node.name);
  }
  return t.memberExpression(toReference(t, node.object, true), toReference(t, node.property, true));
}

// Filters out empty children, and transform JSX expressions
// into normal expressions.

function buildChildren(t, rawChildren) {
  return rawChildren.reduce(function (children, child) {
    if (t.isJSXExpressionContainer(child)) {
      child = child.expression;
    }

    if (t.isLiteral(child) && typeof child.value === "string") {
      var text = cleanText(child);
      if (!text) {
        return children;
      }

      child = t.literal(text);
    } else if (t.isJSXEmptyExpression(child)) {
      return children;
    } else if (t.isArrayExpression(child)) {
      child = t.sequenceExpression(buildChildren(t, child.elements));
    } else if (t.isIdentifier(child) || t.isMemberExpression(child)) {
      child = toReference(t, child);
    }

    children.push(child);
    return children;
  }, []);
}