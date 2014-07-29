(function() {
  var addHandlers, currentPage, currentPageFlag, handlerExists, handlerName, pageHandlers, runFlowHandlers, runHandlers, runPageHandlers, toNS, turbolinksEnabled;

  turbolinksEnabled = this.Turbolinks && this.Turbolinks.supported === true;

  pageHandlers = new Tatami.__class__.Storage("pageHandlers");

  currentPage = void 0;

  toNS = function(str) {
    return str.replace("-", "_");
  };

  handlerName = function(func) {
    return func.toString().length.toString(16) + "";
  };

  handlerExists = function(host, page, func, name) {
    var existed, handler;
    handler = pageHandlers.get("" + page + "." + host + "." + name);
    existed = this.equal(func, handler);
    return existed;
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
          return handlers[flag][host][name] = func;
        }
      };
    })(this));
    return pageHandlers.set(handlers);
  };

  runHandlers = function(handlers, callback) {
    return this.each(handlers, function(handler) {
      if (callback) {
        callback();
      }
      return handler();
    });
  };

  runFlowHandlers = function(type) {
    return this.each(["unspecified", currentPageFlag(true)], (function(_this) {
      return function(page) {
        return runHandlers.call(_this, pageHandlers.storage[page][type]);
      };
    })(this));
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

  Tatami.extend({
    handlers: [
      {
        name: "inPage",
        handler: function(page, func) {
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
            if (turbolinksEnabled) {
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

  if (turbolinksEnabled) {
    Tatami.mixin({
      prepare: function(handler) {
        addHandlers.call(this, "prepare", [currentPage], handler);
      },
      ready: function(handler) {
        addHandlers.call(this, "ready", [currentPage], handler);
      }
    });
    Tatami.init({
      runSandbox: function() {
        return $(document).on({
          "page:change": (function(_this) {
            return function() {
              var page;
              console.log("change");
              page = currentPageFlag(true);
              runHandlers.call(_this, pageHandlers.storage[page].init, function() {
                return currentPage = page;
              });
              return runFlowHandlers.call(_this, "prepare");
            };
          })(this),
          "page:load": (function(_this) {
            return function() {
              console.log("load");
              return runFlowHandlers.call(_this, "ready");
            };
          })(this)
        });
      }
    });
  }

}).call(this);
