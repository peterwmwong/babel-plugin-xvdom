const toReference = require('./toReference');

// Trims the whitespace off the lines.
function lineFilter(lines, line, i, { length }){
  if(i > 0){ line = line.trimLeft(); }
  if(i + 1 < length){ line = line.trimRight(); }
  if(line){ lines.push(line); }

  return lines;
}

// Cleans the whitespace from a text node.
function cleanText(astNode){
  const { value } = astNode;
  if (!/\S/.test(value)) return '';

  return (
    value
      .split(/\r\n?|\n/)
      .reduce(lineFilter, [])
      .join(' ')
  );
}

// Filters out empty children, and transform JSX expressions
// into normal expressions.
module.exports = function normalizeChildren(t, rawChildren){
  return rawChildren.reduce((children, child) => {
    if (t.isJSXExpressionContainer(child)){
      child = child.expression;
    }

    if ((t.isJSXText(child) || t.isLiteral(child)) && typeof child.value === 'string'){
      const text = cleanText(child);
      if(!text){ return children; }

      child = t.stringLiteral(text);
    }
    else if(t.isJSXEmptyExpression(child)){
      return children;
    }
    else if(t.isArrayExpression(child)){
      child = t.sequenceExpression(normalizeChildren(t, child.elements));
    }
    else if(t.isIdentifier(child) || t.isMemberExpression(child)){
      child = toReference(t, child);
    }

    children.push(child);
    return children;
  }, []);
}
