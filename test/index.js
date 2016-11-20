const path   = require("path");
const fs     = require("fs");
const assert = require("assert");
const babel  = require("babel-core");
const plugin = require("../src/index");

const BABEL_CONFIG = { plugins: ["syntax-jsx", plugin] };

const filterFixtures = fixture => [
  "el",
  "el-comment-children",
  "el-dynamic-children",
  "el-dynamic-props",
  "el-key-prop",
  "el-static-children",
  "el-static-props",
  "component",
  "component-dynamic-props",
  "component-static-props",
  "cloneable",
  // "cloneable-nested-dynamics"
  // "recycle"
].indexOf(fixture) !== -1;

const specName     = fixture   => fixture.split("-").join(" ")
const expectedPath = (...args) => path.join(...[...args, "expected.js"]);
const actualPath   = (...args) => path.join(...[...args, "actual.js"]);
const transform    = path      => babel.transformFileSync(path, BABEL_CONFIG).code.trim()

describe("transforms jsx", () => {
  const fixturesDir = path.join(__dirname, "fixtures");
  fs.readdirSync(fixturesDir)
    .filter(filterFixtures)
    .forEach(dir => {
      it(specName(dir), () => {
        // transform(actualPath(fixturesDir, dir));
        assert.equal(
          transform(actualPath(fixturesDir, dir)),
          fs.readFileSync(expectedPath(fixturesDir, dir)).toString().trim()
        )
      });
    });
});
