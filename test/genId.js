const assert = require("assert");
const genId  = require("../src/genId");

describe("genId(num)", () => {
  it("returns unique strings", () => {
    assert.equal(genId(0), "a");
    assert.equal(genId(1), "b");

    assert.equal(genId(25), "z");
    assert.equal(genId(26), "A");
    assert.equal(genId(27), "B");

    assert.equal(genId(51), "Z");
    assert.equal(genId(52), "a1");
    assert.equal(genId(53), "b1");

    assert.equal(genId(102), "Y1");
    assert.equal(genId(103), "Z1");
    assert.equal(genId(104), "a2");

    assert.equal(genId(154), "Y2");
    assert.equal(genId(155), "Z2");
    assert.equal(genId(156), "a3");
  });
});
