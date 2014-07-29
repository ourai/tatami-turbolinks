(function() {
  var Storage, addHandlers, currentPage, currentPageFlag, handlerExists, handlerName, pageHandlers, prepare, ready, runHandlers, runPageHandlers, runPrepareHandlers, runReadyHandlers, toNS, turbolinksEnabled;

  turbolinksEnabled = this.Turbolinks && this.Turbolinks.supported === true;

  Storage = Tatami.__class__.Storage;

  pageHandlers = new Storage("pageHandlers");

  prepare = new Storage("prepareHandlers");

  ready = new Storage("readyHandlers");

  currentPage = void 0;

  toNS = function(str) {
    return str.replace("-", "_");
  };

  handlerName = function(func) {
    return func.toString().length.toString(16) + "";
  };

  handlerExists = function(host, page, func) {
    var existed, handler, name;
    name = handlerName(func);
    handler = host.get("" + page + "." + name);
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
          flag = "__GLOBAL__";
        }
        flag = toNS(flag);
        if (!handlerExists.apply(_this, [host, flag, func])) {
          name = handlerName(func);
          _this.namespace(handlers, "" + flag + "." + name);
          return handlers[flag][name] = func;
        }
      };
    })(this));
    return host.set(handlers);
  };

  runHandlers = function(handlers, callback) {
    return this.each(handlers, function(handler) {
      if (callback) {
        callback();
      }
      return handler();
    });
  };

  runPrepareHandlers = function() {
    runHandlers.call(this, prepare.storage.__GLOBAL__);
    return runHandlers.call(this, prepare.storage[currentPageFlag(true)]);
  };

  runReadyHandlers = function() {
    runHandlers.call(this, ready.storage.__GLOBAL__);
    return runHandlers.call(this, ready.storage[currentPageFlag(true)]);
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
              args.unshift(pageHandlers);
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
        addHandlers.call(this, prepare, [currentPage], handler);
      },
      ready: function(handler) {
        addHandlers.call(this, ready, [currentPage], handler);
      }
    });
    Tatami.init({
      runSandbox: function(prepareHandlers, readyHandlers) {
        return $(document).on({
          "page:change": (function(_this) {
            return function() {
              var page;
              console.log("change");
              page = currentPageFlag(true);
              runHandlers.call(_this, pageHandlers.storage[page], function() {
                return currentPage = page;
              });
              return runPrepareHandlers.call(_this);
            };
          })(this),
          "page:load": (function(_this) {
            return function() {
              console.log("load");
              return runReadyHandlers.call(_this);
            };
          })(this)
        });
      }
    });
  }

}).call(this);
