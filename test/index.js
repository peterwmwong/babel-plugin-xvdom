const path   = require("path");
const fs     = require("fs");
const assert = require("assert");
const babel  = require("babel-core");
const plugin = require("../src/index");
import genId from "../src/genId";

describe("turn jsx into xvdom", ()=> {
  const fixturesDir = path.join(__dirname, "fixtures");

  fs.readdirSync(fixturesDir).map(caseName=> {
    if([
      "attributes",
      "multiple-attributes",
      "children-static-value",
      "children-dynamic-values-simple",
      "children-dynamic-values",
      // "component",
      // "component-dynamic-props",
      // "children",
      // "element",
      // "expression-nested",
      // "expression",
      // "key",
      // "prop-dynamic-values-simple",
      // "recycle"
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


  describe("genId(num)", ()=>{
    it("returns unique strings", ()=>{
      assert.equal(genId(0), "a");
      assert.equal(genId(1), "b");
      assert.equal(genId(2), "c");
      assert.equal(genId(3), "d");
      assert.equal(genId(4), "e");
      assert.equal(genId(52), "a1");
      assert.equal(genId(53), "b1");
      assert.equal(genId(103), "Z1");
      assert.equal(genId(155), "Z2");
      assert.equal(genId(156), "a3");
    });
  });
});
