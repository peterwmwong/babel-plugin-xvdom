const path   = require("path");
const fs     = require("fs");
const assert = require("assert");
const babel  = require("babel-core");
const plugin = require("../src/index");

const BABEL_CONFIG = { plugins: ["syntax-jsx", plugin] };

const filterFixtures = fixture => [
  "cloneable",
  "cloneable-multiple-dynamic-props",
  "cloneable-root-props",
  "cloneable-saved-path-nodes",
  "cloneable-static-props",
  "component",
  "component-dynamic-props",
  "component-static-props",
  "el",
  "el-comment-children",
  "el-dynamic-children",
  "el-dynamic-children-only-child",
  "el-dynamic-children-text",
  "el-dynamic-children-text-first-child",
  "el-dynamic-children-text-not-first-or-only-child",
  "el-dynamic-children-text-only-child",
  "el-dynamic-props",
  "el-key-prop",
  "el-static-children",
  "el-static-props"
  // "recycle"
].indexOf(fixture) !== -1;

const fixturesDir   = path.join(__dirname, "fixtures");
const dirTospecName = fixture     => fixture.split("-").join(" ")
const fixturePath   = (dir, file) => path.join(fixturesDir, dir, file);
const transform     = path        => babel.transformFileSync(path, BABEL_CONFIG).code.trim()

describe("transforms jsx", () => {
  for(let dir of fs.readdirSync(fixturesDir).filter(filterFixtures)) {
    it(dirTospecName(dir), () => {
      assert.equal(
        transform(fixturePath(dir, 'actual.js')),
        fs.readFileSync(fixturePath(dir, 'expected.js')).toString().trim()
      )
    });
  }
});
