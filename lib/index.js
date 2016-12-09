'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./helpers.js'),
    buildChildren = _require.buildChildren,
    toReference = _require.toReference;

var _require2 = require('./logger.js'),
    LOGGING = _require2.LOGGING,
    log = _require2.log,
    logFunc = _require2.logFunc;

var genId = require('./genId.js');

var NODE_EL = 'el';
var NODE_COMPONENT = 'component';
var NODE_STATIC = 'staticChild';
var NODE_DYNAMIC = 'dynamicChild';

var PROP_COMPONENT = 'componentProp';
var PROP_EL = 'elProp';

var EMPTY_ARRAY = [];

var isCloneableAttribute = function isCloneableAttribute(attr) {
  return attr.name.name === 'cloneable';
};
var isKeyAttribute = function isKeyAttribute(attr) {
  return attr.name.name === 'key';
};
var isXvdomAttribute = function isXvdomAttribute(attr) {
  return isCloneableAttribute(attr) || isKeyAttribute(attr);
};
var isComponentName = function isComponentName(name) {
  return (/^[A-Z]/.test(name)
  );
};

var nonComponentPropDynamic = function nonComponentPropDynamic(_ref) {
  var type = _ref.type;
  return type !== PROP_COMPONENT;
};
var instParamId = function instParamId(t) {
  return t.identifier('inst');
};
var prevInstParamId = function prevInstParamId(t) {
  return t.identifier('pInst');
};
var tmpVarId = function tmpVarId(t, num) {
  return t.identifier('_n' + (num ? ++num : ''));
};
var xvdomApiFuncName = function xvdomApiFuncName(name) {
  return 'xvdom' + name[0].toUpperCase() + name.slice(1);
};

var hasSideEffects = function hasSideEffects(tag, propName) {
  return tag === 'input' && propName === 'value' || tag === 'a' && propName === 'href';
};

var _fileGlobalForFile = new WeakMap();

var FileGlobals = function () {
  FileGlobals.forFile = function forFile(t, file) {
    return _fileGlobalForFile.get(file) || _fileGlobalForFile.set(file, new FileGlobals(t, file)).get(file);
  };

  function FileGlobals(t, file) {
    _classCallCheck(this, FileGlobals);

    this._t = t;
    this._file = file;
    this._definedPrefixCounts = new Map();
    this._globals = {};
  }

  FileGlobals.prototype.definePrefixed = function definePrefixed(name, value) {
    var _definedPrefixCounts = this._definedPrefixCounts;

    var count = 1 + (_definedPrefixCounts.get(name) | 0);
    var globalId = count === 1 ? name : name + count;

    _definedPrefixCounts.set(name, count);
    return this._globals[globalId] = {
      uniqueNameId: this._file.scope.generateUidIdentifier(name),
      value: value
    };
  };

  FileGlobals.prototype.accessFunction = function accessFunction(apiFuncName) {
    var _t = this._t;

    var globalId = xvdomApiFuncName(apiFuncName);
    var global = this._globals[globalId];
    return (global || (this._globals[globalId] = {
      uniqueNameId: this._file.scope.generateUidIdentifier(globalId),
      value: _t.memberExpression(_t.identifier('xvdom'), _t.identifier(apiFuncName))
    })).uniqueNameId;
  };

  _createClass(FileGlobals, [{
    key: 'allGlobals',
    get: function get() {
      return this._globals;
    }
  }]);

  return FileGlobals;
}();

function isDynamicNode(t, astNode) {
  if (t.isLiteral(astNode)) {
    return false;
  }

  if (t.isLogicalExpression(astNode) || t.isBinaryExpression(astNode)) {
    return isDynamicNode(t, astNode.left) || isDynamicNode(t, astNode.right);
  }

  if (t.isUnaryExpression(astNode)) {
    return isDynamicNode(t, astNode.argument);
  }

  return true;
}

function obj(t, keyValues) {
  return t.objectExpression(Object.keys(keyValues).map(function (key) {
    var value = keyValues[key];
    return t.isFunctionExpression(value) ? t.objectMethod('method', t.identifier(key), value.params, value.body) : t.objectProperty(t.identifier(key), value);
  }));
}

function normalizeElementPropValue(t, prop) {
  return t.isJSXExpressionContainer(prop) ? normalizeElementPropValue(t, prop.expression) : t.isJSXEmptyExpression(prop) ? null : t.isIdentifier(prop) || t.isMemberExpression(prop) ? toReference(t, prop) : prop == null ? t.booleanLiteral(true) : prop;
}

function generateAssignDynamicProp(_ref2, domNodeExpression, _ref3, expressionToAssignDomNode) {
  var t = _ref2.t,
      instId = _ref2.instId,
      statements = _ref2.statements;
  var isDynamic = _ref3.isDynamic,
      dynamic = _ref3.dynamic,
      valueNode = _ref3.valueNode,
      nameId = _ref3.nameId;

  var valueCode = isDynamic ? t.memberExpression(instId, dynamic.instanceValueId) : valueNode;

  // Optimization: combine assigning to contextual node `inst.a` to the instance.
  if (expressionToAssignDomNode) {
    domNodeExpression = t.assignmentExpression('=', expressionToAssignDomNode, domNodeExpression);
  }

  var exprStmt = t.expressionStatement(t.assignmentExpression('=', t.memberExpression(domNodeExpression, nameId), valueCode));

  statements.push(!dynamic.hasSideEffects ? exprStmt : t.ifStatement(t.binaryExpression('!=', valueCode, t.nullLiteral()), exprStmt));
}

function generateSpecElementDynamicChildCode(_ref4, childDesc, parentNodeVarId) {
  var t = _ref4.t,
      xvdomApi = _ref4.xvdomApi,
      statements = _ref4.statements,
      instId = _ref4.instId;
  var _childDesc$dynamic = childDesc.dynamic,
      instanceContextId = _childDesc$dynamic.instanceContextId,
      instanceValueId = _childDesc$dynamic.instanceValueId,
      isOnlyChild = childDesc.isOnlyChild;

  statements.push(t.expressionStatement(t.assignmentExpression('=', t.memberExpression(instId, instanceContextId), t.callExpression(xvdomApi.accessFunction('createDynamic'), [t.booleanLiteral(isOnlyChild), parentNodeVarId, t.memberExpression(instId, instanceValueId)]))));
}

function generateSpecElementStaticChildCode(_ref5, _ref6, parentNodeVarId) {
  var t = _ref5.t,
      xvdomApi = _ref5.xvdomApi,
      statements = _ref5.statements,
      instId = _ref5.instId;
  var node = _ref6.node,
      isOnlyChild = _ref6.isOnlyChild;

  statements.push(t.expressionStatement(
  // Optimization: https://jsperf.com/textcontent-vs-createtextnode-vs-innertext
  isOnlyChild ? // _n.textContent = "hello" + 5;
  t.assignmentExpression('=', t.memberExpression(parentNodeVarId, t.identifier('textContent')), node) : // _n.appendChild(document.createTextNode(("hello" + 5) || ""));
  t.callExpression(t.memberExpression(parentNodeVarId, t.identifier('appendChild')), [t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('createTextNode')), [node])])));
}

function generateSpecCreateComponentCode(context, el, depth) {
  var t = context.t,
      instId = context.instId,
      xvdomApi = context.xvdomApi,
      tmpVars = context.tmpVars,
      statements = context.statements;

  var componentId = t.identifier(el.tag);
  var propsArg = !el.props.length ? t.nullLiteral() : obj(t, el.props.reduce(function (acc, _ref7) {
    var nameId = _ref7.nameId,
        valueNode = _ref7.valueNode,
        dynamic = _ref7.dynamic;
    return acc[nameId.name] = dynamic ? t.memberExpression(instId, dynamic.instanceValueId) : valueNode, acc;
  }, {}));

  // Create element
  // ex. _xvdomCreateComponent('div');
  var createComponentCode = t.callExpression(xvdomApi.accessFunction('createComponent'), [componentId, t.memberExpression(componentId, t.identifier('state')), propsArg, instId]);
  if (el.hasDynamicProps) {
    createComponentCode = t.assignmentExpression('=', t.memberExpression(instId, el.instanceContextId), createComponentCode);
  }

  var createCode = t.memberExpression(createComponentCode, t.identifier('$n'));

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  if (tmpVars[depth]) {
    // ...Otherwise assign it to the temp variable.
    statements.push(t.expressionStatement(t.assignmentExpression('=', tmpVars[depth], createCode)));
  } else {
    tmpVars[depth] = t.variableDeclarator(tmpVarId(t, depth), createCode);
  }

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if (depth) {
    statements.push(t.expressionStatement(t.callExpression(t.memberExpression(tmpVars[depth - 1].id, t.identifier('appendChild')), [tmpVars[depth].id])));
  }
}

function generateSpecCreateHTMLElementCode(context, el, depth) {
  var t = context.t,
      xvdomApi = context.xvdomApi,
      tmpVars = context.tmpVars,
      statements = context.statements,
      shouldGenerateDynamicPropCode = context.shouldGenerateDynamicPropCode;

  // Create element
  // ex. _xvdomEl('div');

  var createCode = t.callExpression(xvdomApi.accessFunction('el'), [t.stringLiteral(el.tag)]);

  // Optimization: If we're using the temp variable for the fist time, assign the
  //               result of the create element code as part of the variable
  //               declaration.
  var tmpVar = tmpVars[depth] ? tmpVars[depth].id : tmpVarId(t, depth);
  if (!tmpVars[depth]) {
    tmpVars[depth] = t.variableDeclarator(tmpVar, createCode);
  } else {
    // ...Otherwise assign it to the temp variable.
    statements.push(t.expressionStatement(t.assignmentExpression('=', tmpVar, createCode)));
  }

  // Assign props
  var nodeVarId = tmpVars[depth].id;
  el.props.forEach(function (prop, i) {
    if (shouldGenerateDynamicPropCode || !prop.isDynamic) {
      // Optimization: Only assign the instanceContextId once
      generateAssignDynamicProp(context, nodeVarId, prop, i === 0 && prop.isDynamic && t.memberExpression(context.instId, prop.dynamic.instanceContextId));
    }
  });

  // Add this node to parent, if there is a parent (not root).
  // ex. _n.appendChild(_n2);
  if (depth) {
    statements.push(t.expressionStatement(t.callExpression(t.memberExpression(tmpVars[depth - 1].id, t.identifier('appendChild')), [tmpVars[depth].id])));
  }

  ++depth;

  el.children.forEach(function (childDesc) {
    switch (childDesc.type) {
      case NODE_COMPONENT:
        return generateSpecCreateComponentCode(context, childDesc, depth);
      case NODE_EL:
        return generateSpecCreateHTMLElementCode(context, childDesc, depth);
      case NODE_DYNAMIC:
        return generateSpecElementDynamicChildCode(context, childDesc, tmpVar);
      case NODE_STATIC:
        return generateSpecElementStaticChildCode(context, childDesc, tmpVar);
    }
  });
}

var distanceFromEnds = function distanceFromEnds(_ref8) {
  var index = _ref8.index,
      distFromEnd = _ref8.distFromEnd;
  return Math.min(index, distFromEnd);
};
var sortDistanceFromEnds = function sortDistanceFromEnds(a, b) {
  return distanceFromEnds(a.el) - distanceFromEnds(b.el);
};

function sortDynamicsByDepthThenDistanceFromEnds(dynamics) {
  return dynamics.reduce(function (depthGroups, d) {
    var depth = d.el.depth;
    (depthGroups[depth] || (depthGroups[depth] = [])).push(d);
    return depthGroups;
  }, []).reduce(function (result, group) {
    result.push.apply(result, group.sort(sortDistanceFromEnds));
    return result;
  }, []);
}

var LAST_PATH_ID = 0;

var Path = function () {
  Path.min = function min(a, b) {
    log('path', 'min: ' + a.id + '(' + a.length + ') < ' + b.id + '(' + b.length + ')');
    return a.length < b.length ? a : b;
  };

  function Path(el) {
    var hardRef = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    _classCallCheck(this, Path);

    this.pathId = ++LAST_PATH_ID;
    this.el = el;
    this.parent = null;
    this.isHardReferenced = hardRef;
    this.numReferencingPaths = 0;
  }

  // TODO: consider renaming this to something more explicit...
  //        - lengthToRootOrSaved


  Path.prototype.isShorterOrEqualThan = function isShorterOrEqualThan(b) {
    var a = this;
    var aEl = a.el;
    var bEl = b.el;
    log('path', 'isShorterOrEqualThan:', 'length: ' + a.id + '(' + a.length + ') < ' + b.id + '(' + b.length + ')', 'elNumDynamicDescendants: ' + aEl.numDynamicDescendants + ' < ' + bEl.numDynamicDescendants, 'hasDynamicProps: ' + aEl.hasDynamicProps + ' < ' + bEl.hasDynamicProps);
    return 0 >= (Math.sign(a.length - b.length) || Math.sign(bEl.numDynamicDescendants - aEl.numDynamicDescendants) ||
    // TODO: consider changing hasDynamicProps to numDynamicProps 
    Math.sign(+aEl.hasDynamicProps - +bEl.hasDynamicProps));
  };

  Path.prototype.toString = function toString() {
    var result = [];
    var path = this;
    while (path) {
      result.push(path.id);
      path = path.parent;
    }
    return result.join(', ');
  };

  Path.prototype.finalize = function finalize(pathHead) {
    var _this = this;

    return logFunc('path', 'finalize ' + this.id, function () {
      _this.addReference();
      _this.el.rootPath = _this;

      var parent = _this.parent;

      if ((!pathHead || !_this.shouldBeSaved) && parent && !parent.isHardReferenced) {
        parent.finalize(_this);
      }
      return _this;
    });
  };

  Path.prototype.removeReference = function removeReference() {
    var _this2 = this;

    logFunc('path', 'removeReference ' + this.id + ' numReferencingPaths = ' + this.numReferencingPaths, function () {
      var rootPath = _this2.el.rootPath;

      if (rootPath && rootPath !== _this2) {
        log('path', 'adding reference to previous rootPath ' + rootPath.id);
        rootPath.removeReference();
      }

      --_this2.numReferencingPaths;
    }, function () {
      return '-> ' + _this2.numReferencingPaths;
    });
  };

  Path.prototype.addReference = function addReference() {
    var _this3 = this;

    logFunc('path', 'addReference ' + this.id + ' numReferencingPaths = ' + this.numReferencingPaths, function () {
      var rootPath = _this3.el.rootPath;

      if (rootPath && rootPath !== _this3) {
        log('path', 'adding reference to previous rootPath ' + rootPath.id);
        rootPath.addReference();
      }

      var shouldBeSaved = _this3.shouldBeSaved;

      ++_this3.numReferencingPaths;

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
      if (!shouldBeSaved && _this3.shouldBeSaved && _this3.parent) {
        _this3.parent.removeReference();
      }
    }, function () {
      return '-> ' + _this3.numReferencingPaths;
    });
  };

  _createClass(Path, [{
    key: 'length',
    get: function get() {
      return this.isHardReferenced ? 0 : this.parent ? this.parent.length + 1 : Number.MAX_SAFE_INTEGER;
    }
  }, {
    key: 'tag',
    get: function get() {
      return this.el.tag;
    }
  }, {
    key: 'shouldBeSaved',
    get: function get() {
      var rootPath = this.el.rootPath,
          isHardReferenced = this.isHardReferenced,
          numReferencingPaths = this.numReferencingPaths;

      return isHardReferenced || numReferencingPaths > 1 || rootPath && rootPath !== this && rootPath.shouldBeSaved;
    }
  }, {
    key: 'id',
    get: function get() {
      var referenceIndicator = this.isHardReferenced ? '*' : this.shouldBeSaved ? '^' : '';
      return '' + referenceIndicator + this.el.tag + '(' + this.pathId + ')';
    }
  }]);

  return Path;
}();

function getPath(el, ignoreEl, isHardReferenced) {
  return logFunc('path', 'getPath ' + el.tag, function () {
    return el.rootPath ? el.rootPath : calcPath(el, ignoreEl, isHardReferenced);
  }, function (result) {
    return '[ ' + result.toString() + ' ]';
  });
}

function calcPath(el, ignoreEl, isHardReferenced) {
  var parent = el.parent;

  if (!parent) return new Path(el, true);
  if (ignoreEl) log('path', 'ignoreEl', ignoreEl.tag);

  var path = new Path(el, isHardReferenced);
  var distFromEnd = el.distFromEnd,
      index = el.index,
      previousSibling = el.previousSibling,
      nextSibling = el.nextSibling;

  var parentPath = void 0;

  if (index === 0) {
    parentPath = ignoreEl === nextSibling ? getPath(parent) : Path.min(getPath(parent), getPath(nextSibling, el));
  } else if (distFromEnd === 0) {
    parentPath = ignoreEl === previousSibling ? getPath(parent) : Path.min(getPath(parent), getPath(previousSibling, el));
  } else if (ignoreEl === previousSibling || ignoreEl !== nextSibling && getPath(nextSibling, el).isShorterOrEqualThan(getPath(previousSibling, el))) {
    parentPath = getPath(nextSibling, el);
  } else {
    parentPath = getPath(previousSibling, el);
  }

  path.parent = parentPath;
  return path;
}

// Determine the relationship from one element to another (ex. parent, next sibling, previous sibling)
function getElementRelationshipTo(el, otherEl) {
  return el === otherEl.firstChild ? 'firstChild' : el === otherEl.lastChild ? 'lastChild' : el === otherEl.nextSibling ? 'nextSibling' : el === otherEl.previousSibling ? 'previousSibling' : 'UNKNOWN';
}

function expressionForRelationOrAssign(t, relationOrAssign) {
  return typeof relationOrAssign === 'string' ? t.identifier(relationOrAssign) : generateMemberExpression(t, relationOrAssign);
}

function generateMemberExpression(t, _ref9) {
  var tmpVar = _ref9.tmpVar,
      path = _ref9.path;

  if (!path) return tmpVar;
  return t.assignmentExpression('=', t.identifier(tmpVar.name), path.slice(1).reduce(function (acc, relationOrAssign) {
    return t.memberExpression(acc, expressionForRelationOrAssign(t, relationOrAssign));
  }, expressionForRelationOrAssign(t, path[0])));
}

function getTmpVarForNode(t, savedNodesToTmpVarId, el) {
  var tmpVar = savedNodesToTmpVarId.get(el);
  if (tmpVar) return tmpVar;

  tmpVar = tmpVarId(t, savedNodesToTmpVarId.size);
  savedNodesToTmpVarId.set(el, tmpVar);
  return tmpVar;
}

function generateSpecCreateCloneableDynamicPropCode(context, dynamic, savedNodesToTmpVarId) {
  var t = context.t;

  var path = dynamic.el.rootPath;
  var el = void 0,
      parentEl = void 0;
  var rootAssignExpr = void 0,
      curAssignExpr = void 0,
      pathMembers = void 0;
  var originalSavedNodes = new Set(savedNodesToTmpVarId.keys());

  if (!path.parent) {
    rootAssignExpr = {
      tmpVar: getTmpVarForNode(t, savedNodesToTmpVarId, path.el)
    };
  } else {
    while (path.parent && !originalSavedNodes.has(el = path.el)) {
      parentEl = path.parent.el;
      pathMembers = [].concat(savedNodesToTmpVarId.has(parentEl) ? [savedNodesToTmpVarId.get(parentEl).name] : path.parent.parent ? EMPTY_ARRAY : [getTmpVarForNode(t, savedNodesToTmpVarId, parentEl).name], [getElementRelationshipTo(el, parentEl)]);

      // Optimization: Inline the assignment of the saved nodes in the member expression
      //               to the dynamic node
      if (!originalSavedNodes.has(el) && path.shouldBeSaved) {
        var newCur = {
          tmpVar: getTmpVarForNode(t, savedNodesToTmpVarId, el),
          path: pathMembers
        };

        if (curAssignExpr) curAssignExpr.path.unshift(newCur);
        rootAssignExpr = rootAssignExpr || newCur;

        curAssignExpr = newCur;
      } else {
        var _curAssignExpr$path;

        (_curAssignExpr$path = curAssignExpr.path).unshift.apply(_curAssignExpr$path, pathMembers);
      }

      path = path.parent;
    }
  }

  log('dynamicsPath', JSON.stringify(rootAssignExpr, null, 2));
  // log('dynamicsPath', generateMemberExpression(t, rootAssignExpr));
  generateAssignDynamicProp(context, generateMemberExpression(t, rootAssignExpr), dynamic.prop, !originalSavedNodes.has(dynamic.el) && dynamic.prop.isDynamic && t.memberExpression(context.instId, dynamic.instanceContextId));
}

function generateSpecCreateCloneableDynamicCode(context, rootEl, rootElId, dynamics) {
  var t = context.t,
      tmpVars = context.tmpVars;

  var savedNodesToTmpVarId = new Map();
  var sortedDynamics = sortDynamicsByDepthThenDistanceFromEnds(dynamics);
  var d = void 0;

  // Calculate shortest paths
  for (var _iterator = sortedDynamics, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
    if (_isArray) {
      if (_i >= _iterator.length) break;
      d = _iterator[_i++];
    } else {
      _i = _iterator.next();
      if (_i.done) break;
      d = _i.value;
    }

    getPath(d.el, undefined, true).finalize();
  }

  for (var _iterator2 = sortedDynamics, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
    if (_isArray2) {
      if (_i2 >= _iterator2.length) break;
      d = _iterator2[_i2++];
    } else {
      _i2 = _iterator2.next();
      if (_i2.done) break;
      d = _i2.value;
    }

    // TODO: Handle dynamic children
    if (d.type !== PROP_EL) return;

    log('dynamicsPath', d.el.rootPath.toString());

    // Generate member expression for path
    generateSpecCreateCloneableDynamicPropCode(context, d, savedNodesToTmpVarId);
  }

  for (var _iterator3 = savedNodesToTmpVarId.entries(), _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
    var _ref10;

    if (_isArray3) {
      if (_i3 >= _iterator3.length) break;
      _ref10 = _iterator3[_i3++];
    } else {
      _i3 = _iterator3.next();
      if (_i3.done) break;
      _ref10 = _i3.value;
    }

    var _ref11 = _ref10,
        el = _ref11[0],
        _tmpVarId = _ref11[1];

    if (el !== rootEl) tmpVars.push(t.variableDeclarator(_tmpVarId));
  }
}

function generateSpecCreateCloneableElementCode(context, el, cloneable /* cloneable */, dynamics) {
  var t = context.t,
      tmpVars = context.tmpVars,
      xvdomApi = context.xvdomApi;

  var rootElId = tmpVarId(t, 0);
  var specNodeId = xvdomApi.definePrefixed('xvdomSpecNode', t.nullLiteral()).uniqueNameId;
  var createSpecContext = Object.assign({}, context, {
    statements: [], tmpVars: [], shouldGenerateDynamicPropCode: false
  });

  // function _xvdomSpecNodeCreate(){
  //   ...
  // }
  generateSpecCreateElementCode(createSpecContext, el);

  var createSpecNodeId = xvdomApi.definePrefixed('xvdomSpecNodeCreate', t.functionExpression(null, EMPTY_ARRAY, t.blockStatement([t.variableDeclaration('var', createSpecContext.tmpVars)].concat(createSpecContext.statements, [t.returnStatement(createSpecContext.tmpVars[0].id)])))).uniqueNameId;

  // var _n = (_xvdomSpecNode || (_xvdomSpecNode = _xvdomSpecNodeCreate())).cloneNode(true);
  tmpVars.push(t.variableDeclarator(rootElId, t.callExpression(t.memberExpression(t.logicalExpression('||', specNodeId, t.assignmentExpression('=', specNodeId, t.callExpression(createSpecNodeId, EMPTY_ARRAY))), t.identifier('cloneNode')), [t.booleanLiteral(true)])));

  generateSpecCreateCloneableDynamicCode(context, el, rootElId, dynamics);
}

function generateSpecCreateElementCode(context, el) {
  if (el.type === 'el') generateSpecCreateHTMLElementCode(context, el, 0);else generateSpecCreateComponentCode(context, el, 0);
}

function generateSpecCreateCode(t, xvdomApi, _ref12) {
  var rootElement = _ref12.rootElement,
      dynamics = _ref12.dynamics,
      hasComponents = _ref12.hasComponents,
      cloneable = _ref12.cloneable;

  var context = {
    t: t,
    xvdomApi: xvdomApi,
    shouldGenerateDynamicPropCode: true,
    instId: instParamId(t),
    tmpVars: [],
    statements: []
  };

  if (cloneable) generateSpecCreateCloneableElementCode(context, rootElement, cloneable, dynamics);else generateSpecCreateElementCode(context, rootElement);

  var params = hasComponents || dynamics.length ? [instParamId(t)] : EMPTY_ARRAY;

  return t.functionExpression(null, params, t.blockStatement([t.variableDeclaration('var', context.tmpVars)].concat(context.statements, [t.returnStatement(context.tmpVars[0].id)])));
}

//TODO: function generateSpecUpdateDynamicPropCode(){}
//TODO: function generateSpecUpdateDynamicChildCode(){}

function generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, getTmpVar, dynamic) {
  var type = dynamic.type,
      instanceContextId = dynamic.instanceContextId,
      instanceValueId = dynamic.instanceValueId,
      name = dynamic.name,
      isOnlyChild = dynamic.isOnlyChild,
      hasSideEffects = dynamic.hasSideEffects;

  if (type === PROP_EL) {
    var tmpVar = getTmpVar();
    return [t.expressionStatement(t.assignmentExpression('=', tmpVar, t.memberExpression(instId, instanceValueId))), t.ifStatement(t.binaryExpression('!==', tmpVar, t.memberExpression(pInstId, instanceValueId)), hasSideEffects ? t.blockStatement([t.ifStatement(t.binaryExpression('!==', t.memberExpression(t.memberExpression(pInstId, instanceContextId), name), tmpVar), t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.memberExpression(pInstId, instanceContextId), name), tmpVar))), t.expressionStatement(t.assignmentExpression('=', t.memberExpression(pInstId, instanceValueId), tmpVar))]) : t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.memberExpression(pInstId, instanceContextId), name), t.assignmentExpression('=', t.memberExpression(pInstId, instanceValueId), tmpVar))))];
  } else {
    return [t.ifStatement(t.binaryExpression('!==', t.memberExpression(instId, instanceValueId), t.memberExpression(pInstId, instanceValueId)), t.expressionStatement(t.assignmentExpression('=', t.memberExpression(pInstId, instanceContextId), t.callExpression(xvdomApi.accessFunction('updateDynamic'), [t.booleanLiteral(isOnlyChild), t.memberExpression(pInstId, instanceValueId), t.assignmentExpression('=', t.memberExpression(pInstId, instanceValueId), t.memberExpression(instId, instanceValueId)), t.memberExpression(pInstId, instanceContextId)]))))];
  }
}

function generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component) {
  var dynamicProps = component.props.filter(function (p) {
    return p.dynamic;
  });
  var condition = dynamicProps.map(function (p) {
    return t.binaryExpression('!==', t.memberExpression(instId, p.dynamic.instanceValueId), t.memberExpression(pInstId, p.dynamic.instanceValueId));
  }).reduce(function (expra, exprb) {
    return t.logicalExpression('||', expra, exprb);
  });
  return t.ifStatement(condition, t.expressionStatement(t.assignmentExpression('=', t.memberExpression(pInstId, component.instanceContextId), t.callExpression(xvdomApi.accessFunction('updateComponent'), [t.identifier(component.tag), t.memberExpression(t.identifier(component.tag), t.identifier('state')), obj(t, component.props.reduce(function (hash, p) {
    hash[p.nameId.name] = !p.dynamic ? p.valueNode : t.assignmentExpression('=', t.memberExpression(pInstId, p.dynamic.instanceValueId), t.memberExpression(instId, p.dynamic.instanceValueId));
    return hash;
  }, {})), t.memberExpression(pInstId, component.instanceContextId)]))));
}

function generateSpecUpdateCode(t, xvdomApi, _ref13) {
  var dynamics = _ref13.dynamics,
      componentsWithDyanmicProps = _ref13.componentsWithDyanmicProps;

  if (!dynamics.length) return t.functionExpression(null, EMPTY_ARRAY, t.blockStatement(EMPTY_ARRAY));

  var instId = instParamId(t);
  var pInstId = prevInstParamId(t);
  var tmpVar = void 0;
  var getTmpVar = function getTmpVar() {
    return tmpVar || (tmpVar = t.identifier('v'));
  };

  var updateDynamicPropCode = dynamics.filter(nonComponentPropDynamic).reduce(function (acc, dynamic) {
    acc.push.apply(acc, generateSpecUpdateDynamicCode(t, xvdomApi, instId, pInstId, getTmpVar, dynamic));
    return acc;
  }, []);

  var updateDynamicComponents = componentsWithDyanmicProps.map(function (component) {
    return generateSpecUpdateDynamicComponentCode(t, xvdomApi, instId, pInstId, component);
  });

  var tmpVarDecl = tmpVar ? [t.variableDeclaration('var', [t.variableDeclarator(tmpVar)])] : EMPTY_ARRAY;

  return t.functionExpression(null, [instId, pInstId], t.blockStatement([].concat(tmpVarDecl, updateDynamicPropCode, updateDynamicComponents)));
}

function generateInstanceCode(t, xvdomApi, _ref14, id) {
  var dynamics = _ref14.dynamics,
      key = _ref14.key;

  return obj(t, dynamics.reduce(function (acc, _ref15) {
    var instanceValueId = _ref15.instanceValueId,
        value = _ref15.value;

    acc[instanceValueId.name] = value;
    return acc;
  }, Object.assign({ $s: id }, key && { key: key })));
}

function generateRenderingCode(t, file, template) {
  var xvdomApi = FileGlobals.forFile(t, file);

  var _xvdomApi$definePrefi = xvdomApi.definePrefixed('xvdomSpec', obj(t, {
    c: generateSpecCreateCode(t, xvdomApi, template),
    u: generateSpecUpdateCode(t, xvdomApi, template),
    r: t.memberExpression(t.identifier('xvdom'), t.identifier('DEADPOOL'))
  })),
      uniqueNameId = _xvdomApi$definePrefi.uniqueNameId,
      specCode = _xvdomApi$definePrefi.value;

  return {
    specCode: specCode,
    instanceCode: generateInstanceCode(t, xvdomApi, template, uniqueNameId)
  };
}

/*
type ElementProp {
  isDynamic: boolean,
  nameId: Identifier,
  valueNode: Node
}
*/
function parseElementProps(_ref16, node, nodeAttributes) /*:ElementProp[]*/{
  var t = _ref16.t,
      file = _ref16.file,
      context = _ref16.context;

  return nodeAttributes.reduce(function (props, attr) {
    if (isXvdomAttribute(attr)) return props;

    var valueNode = normalizeElementPropValue(t, attr.value);
    var name = attr.name.name;
    var nameId = t.identifier(name);
    var isDynamic = isDynamicNode(t, valueNode);
    var prop = {
      isDynamic: isDynamic,
      nameId: nameId,
      valueNode: valueNode
    };

    prop.dynamic = isDynamic && context.addDynamicProp(node, prop, nameId, valueNode, hasSideEffects(node.tag, name));
    props.push(prop);
    return props;
  }, []);
}

/*
type ElementChild {
  isDynamic: boolean,
  node: Node
}
*/
function parseElementChild(_ref17, childNode, parent, depth, isOnlyChild, index) /*:ElementChild*/{
  var t = _ref17.t,
      file = _ref17.file,
      context = _ref17.context;

  var isDynamic = isDynamicNode(t, childNode);
  return {
    index: index,
    depth: depth,
    isOnlyChild: isOnlyChild,
    distFromEnd: parent.children && parent.children.length - index - 1,
    type: isDynamic ? NODE_DYNAMIC : NODE_STATIC,
    dynamic: isDynamic && context.addDynamicChild(parent, childNode, isOnlyChild),
    node: childNode
  };
}

/*
type Element {
  props: ElementProp[],
  children: (Element|ElementChild)[]
}
*/
function parseElement(_ref18, _ref19, parent, depth, index, distFromEnd) /*:Element*/{
  var t = _ref18.t,
      file = _ref18.file,
      context = _ref18.context;
  var _ref19$openingElement = _ref19.openingElement,
      name = _ref19$openingElement.name,
      attributes = _ref19$openingElement.attributes,
      children = _ref19.children;

  var isComponent = isComponentName(name.name);
  var filteredChildren = buildChildren(t, children);
  var numChildren = filteredChildren.length;
  var hasOnlyOneChild = numChildren === 1;
  var el = {
    parent: parent,
    index: index,
    depth: depth,
    distFromEnd: distFromEnd,
    get nextSibling() {
      return parent.children[index + 1];
    },
    get previousSibling() {
      return parent.children[index - 1];
    },
    type: isComponent ? NODE_COMPONENT : NODE_EL,
    tag: name.name
  };
  el.props = parseElementProps(context, el, attributes);

  var childDepth = depth + 1;
  var numDynamicDescendants = 0;

  el.children = isComponent ? EMPTY_ARRAY : filteredChildren.map(function (child, childIndex) {
    var parsedChild = void 0;
    if (t.isJSXElement(child)) {
      parsedChild = parseElement(context, child, el, childDepth, childIndex, numChildren - childIndex - 1);
      if (parsedChild.hasDynamicProps) ++numDynamicDescendants;
      numDynamicDescendants += parsedChild.numDynamicDescendants;
    } else {
      parsedChild = parseElementChild(context, child, el, childDepth, hasOnlyOneChild, childIndex, numChildren - childIndex - 1);
      if (parsedChild.dynamic) ++numDynamicDescendants;
    }
    return parsedChild;
  });
  el.hasDynamicProps = el.props.some(function (p) {
    return p.dynamic;
  });
  el.numDynamicDescendants = numDynamicDescendants;
  el.firstChild = el.children[0];
  el.lastChild = el.children[el.children.length - 1];

  if (isComponent) context.hasComponents = true;
  return el;
}

var ParsingContext = function () {
  function ParsingContext(t, file) {
    _classCallCheck(this, ParsingContext);

    this.t = t;
    this.file = file;
    this.dynamics = [];
    this.componentsWithDyanmicProps = new Set();
    this._instanceParamIndex = 0;
    this.context = this;
    this.hasComponents = false;
  }

  ParsingContext.prototype.addDynamicChild = function addDynamicChild(parent, childNode, isOnlyChild) /*:{type:String, value:Node, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    return this._addDynamic({
      parent: parent,
      type: 'child',
      value: childNode,
      instanceContextId: this._generateInstanceParamId(),
      instanceValueId: this._generateInstanceParamId(),
      isOnlyChild: isOnlyChild
    });
  };

  ParsingContext.prototype.addDynamicProp = function addDynamicProp(el, prop, name, value, hasSideEffects) /*:{type:String, name:String, value:Node, hasSideEffects:Boolean, instanceContextId:Identifier, instanceValueId:Identifier}*/{
    var isElementProp = el.type === NODE_EL;
    var dynamic = {
      type: isElementProp ? PROP_EL : PROP_COMPONENT,
      el: el,
      prop: prop,
      name: name,
      value: value,
      hasSideEffects: hasSideEffects,
      instanceContextId: this._getInstanceContextIdForNode(el),
      instanceValueId: this._generateInstanceParamId()
    };
    return isElementProp ? this._addDynamic(dynamic) : this._addDynamicPropForComponent(el, dynamic);
  };

  ParsingContext.prototype._addDynamic = function _addDynamic(dynamic) {
    this.dynamics.push(dynamic);
    return dynamic;
  };

  ParsingContext.prototype._addDynamicPropForComponent = function _addDynamicPropForComponent(component, dynamic) {
    this.componentsWithDyanmicProps.add(component);
    return this._addDynamic(dynamic);
  };

  ParsingContext.prototype._getInstanceContextIdForNode = function _getInstanceContextIdForNode(el) {
    if (!el.instanceContextId) el.instanceContextId = this._generateInstanceParamId();
    return el.instanceContextId;
  };

  ParsingContext.prototype._generateInstanceParamId = function _generateInstanceParamId() {
    return this.t.identifier(genId(this._instanceParamIndex++));
  };

  return ParsingContext;
}();

function parseKeyProp(t, _ref20) {
  var attributes = _ref20.attributes;

  var keyAttr = attributes.find(isKeyAttribute);
  if (keyAttr) return normalizeElementPropValue(t, keyAttr.value);
}

function parseTemplate(t, file, node) /*:{id:Identifier, root:Element}*/{
  var context = new ParsingContext(t, file);
  var openingElement = node.openingElement;

  var isCloneable = openingElement.attributes.some(isCloneableAttribute);
  return {
    key: parseKeyProp(t, openingElement),
    rootElement: parseElement(context, node, null, 0, 0, 0),
    dynamics: context.dynamics,
    componentsWithDyanmicProps: Array.from(context.componentsWithDyanmicProps.keys()),
    hasComponents: context.hasComponents,
    cloneable: isCloneable
  };
}

module.exports = function (_ref21) {
  var t = _ref21.types;
  return {
    visitor: {
      JSXElement: {
        exit: function exit(path, _ref22) {
          var file = _ref22.file;

          if (t.isJSX(path.parent)) return;

          var template = parseTemplate(t, file, path.node);

          var _generateRenderingCod = generateRenderingCode(t, file, template),
              instanceCode = _generateRenderingCod.instanceCode;

          path.replaceWith(instanceCode);
        }
      },
      Program: {
        exit: function exit(path, _ref23) {
          var file = _ref23.file;

          var fileGlobals = FileGlobals.forFile(t, file).allGlobals;
          var globalKeys = fileGlobals ? Object.keys(fileGlobals) : EMPTY_ARRAY;
          if (!globalKeys.length) return;

          file.path.unshiftContainer('body', t.variableDeclaration('var', globalKeys.sort().map(function (key) {
            var _fileGlobals$key = fileGlobals[key],
                uniqueNameId = _fileGlobals$key.uniqueNameId,
                value = _fileGlobals$key.value;

            return t.variableDeclarator(uniqueNameId, value);
          })));
        }
      }
    }
  };
};