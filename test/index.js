const path   = require("path");
const fs     = require("fs");
const assert = require("assert");
const babel  = require("babel");
const plugin = require("../src/index");

describe("turn jsx into xvdom", ()=> {
  const fixturesDir = path.join(__dirname, "fixtures");

  fs.readdirSync(fixturesDir).map(caseName=> {
    if([
      "element",
      "attributes",
      "children"//,
      // "children-dynamic-values",
      // "expression",
      // "expression-nested"
    ].indexOf(caseName) === -1) return;

    it(`should ${caseName.split("-").join(" ")}`, ()=> {
      const fixtureDir = path.join(fixturesDir, caseName);
      const expected   = fs.readFileSync(path.join(fixtureDir, "expected.js")).toString();
      const actual     = babel.transformFileSync(
        path.join(fixtureDir, "actual.js"), {
          blacklist: ["strict", "react"],
          plugins: [plugin]
        }
      ).code;

      assert.equal(actual.trim(), expected.trim());
    });
  });
});
