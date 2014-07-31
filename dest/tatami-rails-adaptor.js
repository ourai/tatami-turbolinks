(function() {
  var addHandlers, currentPage, currentPageFlag, handlerExists, handlerName, pageHandlers, pushSeq, runAllHandlers, runFlowHandlers, runHandlers, runPageHandlers, sequence, toNS, _T, _ref, _ref1;

  if (!Tatami.isPlainObject((_ref = Tatami.adaptor) != null ? _ref.rails : void 0)) {
    return false;
  }

  _T = Tatami;

  pageHandlers = new _T.__class__.Storage("pageHandlers");

  sequence = {};

  currentPage = void 0;

  _T.mixin({
    adaptor: {
      rails: {
        turbolinks: {
          enabled: ((_ref1 = this.Turbolinks) != null ? _ref1.supported : void 0) === true,
          handlers: pageHandlers.storage,
          sequence: sequence
        }
      }
    }
  });

  toNS = function(str) {
    return str.replace("-", "_");
  };

  handlerName = function(func) {
    return func.toString().length.toString(16) + "";
  };

  handlerExists = function(host, page, func, name) {
    return this.equal(func, pageHandlers.get("" + page + "." + host + "." + name));
  };

  pushSeq = function(page, type, name) {
    var seq;
    seq = this.namespace(sequence, "" + page + "." + type);
    if (seq == null) {
      seq = sequence[page][type] = [];
    }
    return seq.push(name);
  };

  addHandlers = function(host, page, func, isPlain) {
    var handlers;
    handlers = {};
    this.each(page, (function(_this) {
      return function(flag, idx) {
        var name;
        if (isPlain) {
          func = flag;
          flag = idx;
        }
        if (flag == null) {
          flag = "unspecified";
        }
        flag = toNS(flag);
        name = handlerName(func);
        if (!handlerExists.apply(_this, [host, flag, func, name])) {
          _this.namespace(handlers, "" + flag + "." + host + "." + name);
          handlers[flag][host][name] = func;
          return pushSeq.apply(_this, [flag, host, name]);
        }
      };
    })(this));
    return pageHandlers.set(handlers);
  };

  runHandlers = function(page, type, callback) {
    var handlers, _ref2;
    handlers = (_ref2 = pageHandlers.storage[page]) != null ? _ref2[type] : void 0;
    if (handlers) {
      return this.each(sequence[page][type], function(handlerName) {
        if (callback) {
          callback();
        }
        return handlers[handlerName]();
      });
    }
  };

  runFlowHandlers = function(type) {
    var flag, lib, loaded, pages, scripts, selector;
    pages = ["unspecified"];
    flag = currentPageFlag(true);
    selector = "body script[data-inside]";
    if (type === "prepare" || $("" + selector + ":not([data-turbolinks-eval='false'][data-loaded='true'])").size() === 0) {
      pages.push(flag);
    }
    this.each(pages, (function(_this) {
      return function(page) {
        return runHandlers.apply(_this, [page, type]);
      };
    })(this));
    if ((scripts = $("" + selector + ":not([data-turbolinks-eval='false'])")).size() > 0) {
      lib = this;
      loaded = 0;
      return $(scripts).on("load", function() {
        loaded++;
        $(this).attr("data-loaded", true);
        if (loaded === scripts.size()) {
          return runHandlers.apply(lib, [flag, type]);
        }
      });
    }
  };

  runPageHandlers = function(page, func, isPlain) {
    return this.each(page, function(flag, idx) {
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
            args = [page, func, isObj];
            if (stack === true || (document.body == null)) {
              args.unshift("init");
              addHandlers.apply(this, args);
            } else {
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
      prepare: function(handler) {
        addHandlers.call(this, "prepare", [currentPage], handler);
      },
      ready: function(handler, page) {
        addHandlers.call(this, "ready", [page != null ? toNS(page) : currentPage], handler);
      }
    });
    runAllHandlers = function(context) {
      var page;
      page = currentPageFlag(true);
      runHandlers.call(context, page, "init", function() {
        return currentPage = page;
      });
      runFlowHandlers.call(context, "prepare");
      return runFlowHandlers.call(context, "ready");
    };
    _T.init({
      runSandbox: function() {
        var context;
        context = this;
        if (this.adaptor.rails.turbolinks.enabled) {
          return $(document).on({
            "page:change": function() {
              return runAllHandlers(context);
            }
          });
        } else {
          return $(document).ready(function() {
            return runAllHandlers(context);
          });
        }
      }
    });
  }

}).call(this);
