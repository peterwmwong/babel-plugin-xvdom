const path   = require("path");
const fs     = require("fs");
const assert = require("assert");
const babel  = require("babel-core");
const plugin = require("../src/index");

describe("turn jsx into xvdom", ()=> {
  const fixturesDir = path.join(__dirname, "fixtures");

  fs.readdirSync(fixturesDir).map(caseName=> {
    if([
      "attributes",
      "multiple-attributes",
      "children-dynamic-values-simple",
      "children-dynamic-values",
      "component",
      "component-dynamic-props",
      "children",
      "element",
      "expression-nested",
      "expression",
      "key",
      "prop-dynamic-values-simple",
      "recycle"
    ].indexOf(caseName) === -1) return;

    it(`should ${caseName.split("-").join(" ")}`, ()=> {
      const fixtureDir = path.join(fixturesDir, caseName);
      const expected   = fs.readFileSync(path.join(fixtureDir, "expected.js")).toString();
      const actual     = babel.transformFileSync(
        path.join(fixtureDir, "actual.js"), {
          plugins: ["syntax-jsx", plugin.default]
        }
      ).code;

      assert.equal(actual.trim(), expected.trim());
    });
  });
});
