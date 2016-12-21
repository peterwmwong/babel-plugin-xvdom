const {
  log,
  logFunc,
  LOGGING
} = require('../logger.js');

let LAST_PATH_ID = 0;
class Path {
  static moreDesirable(a, b) { return a.isMoreDesirableThan(b) ? a : b; }

  constructor(el, hardRef = false) {
    this.parent = null;
    this.pathId = ++LAST_PATH_ID;
    this.el = el;
    this.isHardReferenced = hardRef;
    this.children = new Set();
    this.referencingDynamics = new Set();
  }

  get length() {
    return (
        this.isHardReferenced ? 0
      : this.parent           ? this.parent.length + 1
      : Number.MAX_SAFE_INTEGER
    );
  }

  get shouldBeSaved() {
    return (
      this.children.size > (this.isHardReferenced ? 0 : 1) ||
      this.referencingDynamics.size > 1
    );
  }

  get id() {
    const referenceIndicator = (
        this.isHardReferenced ? '*'
      : this.shouldBeSaved    ? '^'
      : ''
    );
    return `${referenceIndicator}${this.el.tag}(children = ${this.children.size}, dynamics = ${this.referencingDynamics.size})`;
  }

  isMoreDesirableThan(b) {
    const a = this;
    const aEl = a.el;
    const bEl = b.el;
    if(LOGGING.path) {
      log('path',
        'isMoreDesirableThan:',
        `length: ${a.id}(${a.length}) < ${b.id}(${b.length})`,
        `elNumDynamicDescendants: ${aEl.numContainedDynamics} < ${bEl.numContainedDynamics}`,
        `numDynamicProps: ${aEl.numDynamicProps} < ${bEl.numDynamicProps}`
      );
    }
    return 0 >= (
      Math.sign(a.length - b.length) ||
      Math.sign(bEl.numContainedDynamics - aEl.numContainedDynamics) ||
      Math.sign(bEl.numDynamicProps - aEl.numDynamicProps)
    );
  }

  toString() {
    const result = [];
    let path = this;
    do { result.push(path.id); }
    while(path = path.parent);
    return result.join(', ');
  }

  // This commits this path AND all ancestor paths to their element.
  // Essentially upgrading this path from "temporary calculation, lets see how this goes" to
  // "All other options have been considered, this is the shortest path to root".
  finalize(dynamic) {
    return logFunc('path',
      `finalize ${this.id}`,
      () => {
        const { parent, el } = this;
        el.finalizedPath = this;
        if(dynamic) this.referencingDynamics.add(dynamic);

        if(parent) {
          parent.addReference(this);
          parent.finalize();
        }
        return this;
      }
    );
  }

  removeReference(childPath) {
    logFunc('path',
      `removeReference ${this.id} ${this.shouldBeSaved}`,
      () => { this.children.delete(childPath); },
      () => `-> ${this.shouldBeSaved}`
    );
  }

  addReference(childPath) {
    logFunc('path',
      `addReference ${this.id} ${this.shouldBeSaved}`,
      () => {
        const { parent, shouldBeSaved } = this;
        this.children.add(childPath);

        // If, by adding this childPath, this path should now shouldBeSaved...
        // we should remove our reference to our parent. This prevents saving
        // more paths than we need.
        // 
        // Consider the example paths "A <- B <- C" (B is the parent of A, C is
        // the parent of B). This path should generate an expression path like
        // `C.B.A`. If B is finalized and is upgraded to `shouldBeSaved`, the
        // expected expression path would be `B.A` and no longer needs to
        // travel through C.  Thus B's path no longer references C's path.
        if(!shouldBeSaved && this.shouldBeSaved && parent){
          parent.removeReference(this);
        }
      },
      () => `-> ${this.shouldBeSaved}`
    );
  }
}

function getPath(el, ignoreEl, isHardReferenced) {
  return logFunc('path',
    `getPath ${el.tag} ${ignoreEl ? `ignoring ${ignoreEl.tag}` : ''}`,
    () => {
      // If it already exists, use element's finalized path.
      if(el.finalizedPath) return el.finalizedPath;

      const { parent } = el;
      if(!parent) return new Path(el, true);

      const path = new Path(el, isHardReferenced);
      const { distFromEnd, index, previousSibling, nextSibling } = el;
      let parentPath;

      if(index === 0) {
        parentPath = (
          ignoreEl === nextSibling
            ? getPath(parent)
            : Path.moreDesirable(getPath(parent), getPath(nextSibling, el))
        );
      }
      else if(distFromEnd === 0) {
        parentPath = (
          ignoreEl === previousSibling
            ? getPath(parent)
            : Path.moreDesirable(getPath(parent), getPath(previousSibling, el))
        );
      }
      else if(
        ignoreEl === previousSibling || (
          ignoreEl !== nextSibling &&
          getPath(nextSibling, el).isMoreDesirableThan(getPath(previousSibling, el))
        )
      ) {
        parentPath = getPath(nextSibling, el);
      }
      else {
        parentPath = getPath(previousSibling, el);
      }

      path.parent = parentPath;
      return path;
    },
    result => `[ ${result.toString()} ]`
  );
}

module.exports = { getPath };