(function() {
  var addHandlers, counter, currentPage, currentPageFlag, deleteHandler, handlerArgs, handlerExists, handlerName, pageHandlers, pageViaAJAX, pushSeq, runAllHandlers, runFlowHandlers, runHandlers, runPageHandlers, sequence, toNS, turbolinksEnabled, _T, _ref, _ref1;

  if (Tatami.isPlainObject((_ref = Tatami.adaptor) != null ? _ref.rails : void 0)) {
    return false;
  }

  _T = Tatami;

  pageHandlers = new _T.__class__.Storage("pageHandlers");

  sequence = {};

  counter = {};

  currentPage = void 0;

  turbolinksEnabled = ((_ref1 = this.Turbolinks) != null ? _ref1.supported : void 0) === true;

  pageViaAJAX = false;

  _T.mixin({
    adaptor: {
      rails: {
        turbolinks: {
          enabled: turbolinksEnabled,
          handlers: pageHandlers.storage,
          sequence: sequence,
          counter: counter
        }
      }
    }
  });

  if (turbolinksEnabled) {
    (function() {
      var loaded, method, onload, scripts;
      method = Node.prototype.insertBefore;
      loaded = 0;
      scripts = 0;
      onload = function() {
        loaded++;
        this.setAttribute("data-loaded", true);
        if (loaded === scripts) {
          return runHandlers(currentPageFlag(true), "ready");
        }
      };
      return Node.prototype.insertBefore = function(node) {
        if (node.tagName.toLowerCase() === "script" && _T.data(node)["inside"]) {
          scripts++;
          node.async = false;
          node.onload = onload;
        }
        return method.apply(this, arguments);
      };
    })();
  }

  toNS = function(str) {
    return str.replace("-", "_");
  };

  handlerExists = function(host, page, func, name) {
    var exists, handlers;
    handlers = pageHandlers.get("" + page + "." + host + "." + name);
    exists = false;
    if (handlers != null) {
      _T.each(handlers, function(h, n) {
        if (_T.hasProp("id", h) || _T.hasProp("id", func)) {
          exists = func.id === h.id;
        } else {
          exists = _T.equal(func, h);
        }
        return !exists;
      });
    }
    return exists;
  };

  handlerName = function(host, page, func) {
    var key, name, _ref2;
    key = (func.id != null ? "" + func.id + "_" : "") + func.toString().length.toString(16);
    _T.namespace(counter, key);
    if (!handlerExists(host, page, func, key)) {
      counter[key] = ((_ref2 = counter[key]) != null ? _ref2 : 0) + 1;
      name = "" + key + "." + counter[key];
    }
    return name;
  };

  pushSeq = function(page, type, name) {
    var seq;
    seq = _T.namespace(sequence, "" + page + "." + type);
    if (seq == null) {
      seq = sequence[page][type] = [];
    }
    return seq.push(name);
  };

  deleteHandler = function(page, type, name) {
    var error, host, part;
    host = pageHandlers.storage[page][type];
    part = name.split(".");
    try {
      delete host[part[0]][part[1]];
    } catch (_error) {
      error = _error;
      host[part[0]][part[1]] = void 0;
    }
    sequence[page][type] = _T.filter(sequence[page][type], function(handlerName) {
      return handlerName !== name;
    });
  };

  handlerArgs = function(type, args) {
    var once, page;
    page = args[1];
    once = _T.isBoolean(page) ? page : args[2];
    page = (page != null) && _T.isString(page) ? toNS(page) : currentPage;
    return [type, [page], args[0], once];
  };

  addHandlers = function(host, page, func, once) {
    var handlers, isPlain;
    isPlain = _T.isPlainObject(page);
    handlers = {};
    _T.each(page, function(flag, idx) {
      var name, part;
      if (isPlain) {
        func = flag;
        flag = idx;
      }
      if (once) {
        func.execOnce = true;
      }
      if (flag == null) {
        flag = "unspecified";
      }
      flag = toNS(flag);
      name = handlerName(host, flag, func);
      if (name != null) {
        _T.namespace(handlers, "" + flag + "." + host + "." + name);
        part = name.split(".");
        handlers[flag][host][part[0]][part[1]] = func;
        pushSeq(flag, host, name);
      }
      return true;
    });
    return pageHandlers.set(handlers);
  };

  runHandlers = function(page, type, callback) {
    var handlers, _ref2;
    handlers = (_ref2 = pageHandlers.storage[page]) != null ? _ref2[type] : void 0;
    if (handlers) {
      return _T.each(sequence[page][type], function(handlerName) {
        var handler, part;
        part = handlerName.split(".");
        handler = handlers[part[0]][part[1]];
        if (callback) {
          callback();
        }
        handler();
        if (handler.execOnce) {
          return deleteHandler(page, type, handlerName);
        }
      });
    }
  };

  runFlowHandlers = function(type) {
    var flag, pages, scripts;
    pages = ["unspecified"];
    flag = currentPageFlag(true);
    scripts = $("body script[data-inside]:not([data-turbolinks-eval='false'][data-loaded='true'])");
    if (type === "prepare" || !turbolinksEnabled || !pageViaAJAX || scripts.size() === 0) {
      pages.push(flag);
    }
    return _T.each(pages, function(page) {
      return runHandlers(page, type);
    });
  };

  runPageHandlers = function(page, func, isPlain) {
    return _T.each(page, function(flag, idx) {
      if (isPlain) {
        func = flag;
        flag = idx;
      }
      if ($("body").is("[data-page='" + flag + "']")) {
        func();
        return false;
      }
    });
  };

  currentPageFlag = function(convert) {
    var page;
    page = $("body").data("page");
    if (convert === true) {
      return toNS(page);
    } else {
      return page;
    }
  };

  _T.extend({
    handlers: [
      {

        /*
         * 只有一个参数并且是字符串时判断当前页面是否为指定页面
         * 否则添加指定页面的执行函数
         * 
         * @method   inPage
         * @param    page {String/Array/Object}    指定页面的标记
         * @param    [func] {Function}             回调函数
         * @param    [stack] {Boolean}             将回调函数加入函数队列
         * @return   {Boolean}
         */
        name: "inPage",
        handler: function(page, func, stack) {
          var args, isObj, result;
          isObj = this.isPlainObject(page);
          if (arguments.length === 1 && !isObj) {
            if (!this.isArray(page)) {
              page = [page];
            }
            result = this.inArray(currentPageFlag(), page) > -1;
          } else {
            if (this.isString(page)) {
              page = [page];
            }
            args = [page, func];
            if (stack === true || (document.body == null)) {
              args.unshift("init");
              addHandlers.apply(this, args);
            } else {
              args.push(isObj);
              runPageHandlers.apply(this, args);
            }
          }
          return result || false;
        },
        validator: function(page, handler) {
          return this.isString(page) || this.isArray(page) || this.isPlainObject(page);
        },
        value: false
      }
    ]
  });

  if (_T.hasProp("supported", this.Turbolinks)) {
    _T.mixin({
      prepare: function() {
        addHandlers.apply(this, handlerArgs("prepare", arguments));
      },
      ready: function() {
        addHandlers.apply(this, handlerArgs("ready", arguments));
      }
    });
    runAllHandlers = function() {
      var page;
      page = currentPageFlag(true);
      runHandlers(page, "init", function() {
        return currentPage = page;
      });
      runFlowHandlers("prepare");
      return runFlowHandlers("ready");
    };
    _T.init({
      runSandbox: function() {
        $(document).on({
          "page:fetch": function() {
            pageViaAJAX = true;
            return _T.destroySystemDialogs();
          },
          "page:load": function() {
            return pageViaAJAX = false;
          }
        });
        return $(document).ready(function() {
          return runAllHandlers();
        });
      }
    });
  }

}).call(this);
