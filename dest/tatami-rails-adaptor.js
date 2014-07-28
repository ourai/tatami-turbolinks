(function() {
  var Adaptor, handlerExists, handlerName, pageHandlers;

  pageHandlers = new Tatami.__class__.Storage("pageHandlers");

  handlerName = function(func) {
    return func.toString().length.toString(16) + "";
  };

  handlerExists = function(page, func) {
    return this.equal(func, pageHandlers.get("" + page + "." + (handlerName(func))));
  };

  Adaptor = {
    handlers: [
      {
        name: "inPage",
        handler: function(page, func) {
          var handlers, isObj, result;
          isObj = this.isPlainObject(page);
          if (arguments.length === 1 && !isObj) {
            if (!this.isArray(page)) {
              page = [page];
            }
            return result = this.inArray($("body").data("page"), page) > -1;
          } else {
            if (this.isString(page)) {
              page = [page];
            }
            handlers = {};
            this.each(page, (function(_this) {
              return function(flag, idx) {
                var name;
                if (isObj) {
                  func = flag;
                  flag = idx;
                }
                if (!handlerExists.apply(_this, [flag, func])) {
                  name = handlerName(func);
                  _this.namespace(handlers, "" + flag + "." + name);
                  handlers[flag][name] = func;
                }
                return true;
              };
            })(this));
            return pageHandlers.set(handlers);
          }
        },
        validator: function(page, handler) {
          return this.isString(page) || this.isArray(page) || this.isPlainObject(page);
        },
        value: false
      }
    ]
  };

  Tatami.extend(Adaptor, Tatami);

  if (this.Turbolinks && this.Turbolinks.supported === true) {
    Tatami.init({
      runSandbox: function(prepareHandlers, readyHandlers) {
        return $(document).on({
          "page:change": (function(_this) {
            return function() {
              _this.each(pageHandlers.storage[$("body").attr("data-page")], function(handler) {
                return handler();
              });
              return _this.run(prepareHandlers);
            };
          })(this),
          "page:load": (function(_this) {
            return function() {
              return _this.run(readyHandlers);
            };
          })(this),
          "page:restore": (function(_this) {
            return function() {
              console.log("restore");
              return _this.run(readyHandlers);
            };
          })(this)
        });
      }
    });
  }

}).call(this);
