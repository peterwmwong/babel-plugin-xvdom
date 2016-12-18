const {
  log,
  logFunc,
  LOGGING
} = require('../logger.js');

let LAST_PATH_ID = 0;
class Path {
  static min(a, b) {
    if(LOGGING.path) log('path', `min: ${a.id}(${a.length}) < ${b.id}(${b.length})`);
    return a.length < b.length ? a : b;
  }

  constructor(el, hardRef = false) {
    this.parent = null;
    this.numReferencingPaths = 0;
    this.pathId = ++LAST_PATH_ID;
    this.el = el;
    this.isHardReferenced = hardRef;
  }

  get length() {
    return (
        this.isHardReferenced ? 0
      : this.parent           ? (this.parent.length + 1)
      : Number.MAX_SAFE_INTEGER
    );
  }

  get tag() { return this.el.tag; }

  get shouldBeSaved() {
    const { el: { rootPath }, isHardReferenced, numReferencingPaths } = this;
    return (
      isHardReferenced ||
      numReferencingPaths > 1 ||
      (rootPath && rootPath !== this && rootPath.shouldBeSaved)
    );
  }

  get id() {
    const referenceIndicator = (
        this.isHardReferenced ? '*'
      : this.shouldBeSaved    ? '^'
      : ''
    );
    return `${referenceIndicator}${this.el.tag}(${this.pathId})`;
  }

  isShorterOrEqualThan(b) {
    const a = this;
    const aEl = a.el;
    const bEl = b.el;
    if(LOGGING.path) {
      log('path',
        'isShorterOrEqualThan:',
        `length: ${a.id}(${a.length}) < ${b.id}(${b.length})`,
        `elNumDynamicDescendants: ${aEl.numContainedDynamics} < ${bEl.numContainedDynamics}`,
        `numDynamicProps: ${aEl.numDynamicProps} < ${bEl.numDynamicProps}`
      );
    }
    return 0 >= (
      Math.sign(a.length - b.length) ||
      Math.sign(bEl.numContainedDynamics - aEl.numContainedDynamics) ||
      Math.sign(aEl.numDynamicProps - bEl.numDynamicProps)
    );
  }

  toString() {
    const result = [];
    let path = this;
    while(path) {
      result.push(path.id);
      path = path.parent;
    }
    return result.join(', ');
  }

  finalize(pathHead) {
    return logFunc('path',
      `finalize ${this.id}`,
      () => {
        this.addReference();
        this.el.rootPath = this;

        const { parent } = this; 
        if((!pathHead || !this.shouldBeSaved) && parent && !parent.isHardReferenced) {
          parent.finalize(this);
        }
        return this;
      }
    );
  }

  removeReference() {
    logFunc('path',
      `removeReference ${this.id} numReferencingPaths = ${this.numReferencingPaths}`,
      () => {
        const { el: { rootPath } } = this;
        if(rootPath && rootPath !== this) {
          if(LOGGING.path) log('path', `adding reference to previous rootPath ${rootPath.id}`);
          rootPath.removeReference();
        }

        --this.numReferencingPaths;
      },
      () => `-> ${this.numReferencingPaths}`
    );
  }

  addReference() {
    logFunc('path',
      `addReference ${this.id} numReferencingPaths = ${this.numReferencingPaths}`,
      () => {
        const { el: { rootPath } } = this;
        if(rootPath && rootPath !== this) {
          if(LOGGING.path) log('path', `adding reference to previous rootPath ${rootPath.id}`);
          rootPath.addReference();
        }

        const { shouldBeSaved } = this;
        ++this.numReferencingPaths;

        /*
        Make sure a parent is not saved when it isn't necessary to.
        Example:

        <a cloneable>
          <b />
          <d>
            <e>
              <i>
                <j>
                  <l id={var1} />
                </j>
                <k>
                  <m id={var1} />
                </k>
              </i>
            </e>
            <f id={var1} />
            <g>
              <h id={var1} />
            </g>
          </d>
          <c id={var1} />
        </a>

        ...without this <e> would be saved.
        */
        if(!shouldBeSaved && this.shouldBeSaved && this.parent) {
          this.parent.removeReference();
        }
      },
      () => `-> ${this.numReferencingPaths}`
    );
  }
}

function getPath(el, ignoreEl, isHardReferenced) {
  return logFunc('path',
    `getPath ${el.tag}`,
    () => {
      if(el.rootPath) return el.rootPath;

      const { parent } = el;
      if(!parent) return new Path(el, true);
      if(LOGGING.path && ignoreEl) log('path', 'ignoreEl', ignoreEl.tag);

      const path = new Path(el, isHardReferenced);
      const { distFromEnd, index, previousSibling, nextSibling } = el;
      let parentPath;

      if(index === 0) {
        parentPath = (
          ignoreEl === nextSibling
            ? getPath(parent)
            : Path.min(getPath(parent), getPath(nextSibling, el))
        );
      }
      else if(distFromEnd === 0) {
        parentPath = (
          ignoreEl === previousSibling
            ? getPath(parent)
            : Path.min(getPath(parent), getPath(previousSibling, el))
        );
      }
      else if(
        ignoreEl === previousSibling || (
          ignoreEl !== nextSibling &&
          getPath(nextSibling, el).isShorterOrEqualThan(getPath(previousSibling, el))
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