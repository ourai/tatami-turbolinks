
/*
 * ----------
 * Adaptor of Tatami for Ruby on Rails
 * ----------
 *= require jquery.turbolinks
 *= require ./tatami
 */

(function() {
  var addHandlers, counter, currentPage, currentPageFlag, deleteHandler, getCachedData, getDataCache, handlerArgs, handlerExists, handlerName, pageHandlers, pageViaAJAX, pushSeq, runAllHandlers, runFlowHandlers, runHandlers, runPageHandlers, sequence, setData, setDataCache, setStorageData, toNS, turbolinksEnabled, _T, _data, _ref;

  if (Tatami.isPlainObject(Tatami.rails)) {
    return false;
  }

  _T = Tatami;

  pageHandlers = new _T.__class__.Storage("pageHandlers");

  sequence = {};

  counter = {};

  currentPage = void 0;

  turbolinksEnabled = ((_ref = this.Turbolinks) != null ? _ref.supported : void 0) === true;

  pageViaAJAX = false;

  _T.mixin({
    rails: {
      turbolinks: {
        enabled: turbolinksEnabled,
        handlers: pageHandlers.storage,
        sequence: sequence,
        counter: counter
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
        if (node.nodeType === 1 && node.tagName.toLowerCase() === "script" && _T.data(node)["inside"]) {
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
    var key, name, _ref1;
    key = (func.id != null ? "" + func.id + "_" : "") + func.toString().length.toString(16);
    _T.namespace(counter, key);
    if (!handlerExists(host, page, func, key)) {
      counter[key] = ((_ref1 = counter[key]) != null ? _ref1 : 0) + 1;
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
    var handlers, _ref1;
    handlers = (_ref1 = pageHandlers.storage[page]) != null ? _ref1[type] : void 0;
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
      }, {

        /*
         * 用于 widget 中执行指定函数
         *
         * @method   runInWidget
         * @return
         */
        name: "runInWidget",
        handler: function() {
          var args, callback, funcName, handler;
          args = this.slice(arguments);
          funcName = args[0];
          if (this.isFunction(funcName)) {
            callback = funcName;
            args = this.slice(args, 1);
            funcName = args[0];
          }
          if (this.functionExists(funcName)) {
            return this.run.apply(this, args);
          } else {
            handler = (function(_this) {
              return function() {
                if (callback) {
                  callback();
                }
                return _this.run.apply(_this, args);
              };
            })(this);
            handler.id = funcName;
            return this.ready(handler, $("body").data("page"), true);
          }
        }
      }
    ]
  });

  if (_T.hasProp("supported", this.Turbolinks)) {
    _data = _T.data;
    getDataCache = function() {
      var _ref1;
      return (_ref1 = $("body").data("" + _T.__meta__.name + ".cache")) != null ? _ref1 : {};
    };
    setDataCache = function(data) {
      $("body").data("" + _T.__meta__.name + ".cache", data);
      return data;
    };
    getCachedData = function(ns_str) {
      var parts, result;
      parts = ns_str.split(".");
      result = getDataCache();
      _T.each(parts, function(part) {
        var rv;
        rv = _T.hasProp(part, result);
        result = result[part];
        return rv;
      });
      return result;
    };
    setStorageData = function(ns_str, data) {
      var cache, isObj, key, length, parts, result;
      parts = ns_str.split(".");
      length = parts.length;
      isObj = _T.isPlainObject(data);
      cache = getDataCache();
      if (length === 1) {
        key = parts[0];
        result = setData(cache, key, data, _T.hasProp(key, cache));
      } else {
        result = cache;
        _T.each(parts, function(n, i) {
          if (i < length - 1) {
            if (!_T.hasProp(n, result)) {
              result[n] = {};
            }
          } else {
            result[n] = setData(result, n, data, _T.isPlainObject(result[n]));
          }
          result = result[n];
          return true;
        });
      }
      setDataCache(cache);
      return result;
    };
    setData = function(target, key, data, condition) {
      if (condition && _T.isPlainObject(data)) {
        $.extend(true, target[key], data);
      } else {
        target[key] = data;
      }
      return target[key];
    };
    _T.mixin({
      prepare: function() {
        addHandlers.apply(this, handlerArgs("prepare", arguments));
      },
      ready: function() {
        addHandlers.apply(this, handlerArgs("ready", arguments));
      },
      data: function() {
        var args, length, result, target;
        args = arguments;
        length = args.length;
        target = args[0];
        if (length > 0 && this.isString(target) && /^[0-9A-Z_.]+[^_.]?$/i.test(target)) {
          result = length === 1 ? getCachedData(target) : setCachedData(target, args[1]);
        } else {
          result = _data.apply(this, this.slice(args));
        }
        return result != null ? result : null;
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
