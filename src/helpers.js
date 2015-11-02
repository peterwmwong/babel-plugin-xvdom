const nonWhitespace = /\S/;
const newlines      = /\r\n?|\n/;

// Trims the whitespace off the lines.
function lineFilter(lines, line, i, { length }){
  if(i > 0){ line = line.trimLeft(); }
  if(i + 1 < length){ line = line.trimRight(); }
  if(line){ lines.push(line); }

  return lines;
}

// Cleans the whitespace from a text node.
function cleanText(node){
  if(!nonWhitespace.test(node.value)){
    return "";
  }

  let lines = node.value.split(newlines);
  lines = lines.reduce(lineFilter, []);

  return lines.join(" ");
}

// Helper to transform a JSX identifier into a normal reference.
export function toReference(t, node, identifier){
  if (t.isIdentifier(node)){
    return node;
  }
  if (t.isJSXIdentifier(node)){
    return identifier ? t.identifier(node.name) : t.stringLiteral(node.name);
  }
  return t.memberExpression(
    toReference(t, node.object, true),
    toReference(t, node.property, true)
  );
}

// Filters out empty children, and transform JSX expressions
// into normal expressions.
export function buildChildren(t, rawChildren){
  return rawChildren.reduce((children, child)=>{
    if (t.isJSXExpressionContainer(child)){
      child = child.expression;
    }

    if ((t.isJSXText(child) || t.isLiteral(child)) && typeof child.value === "string"){
      const text = cleanText(child);
      if(!text){ return children; }

      child = t.stringLiteral(text);
    }
    else if(t.isJSXEmptyExpression(child)){
      return children;
    }
    else if(t.isArrayExpression(child)){
      child = t.sequenceExpression(buildChildren(t, child.elements));
    }
    else if(t.isIdentifier(child) || t.isMemberExpression(child)){
      child = toReference(t, child);
    }

    children.push(child);
    return children;
  }, []);
}
