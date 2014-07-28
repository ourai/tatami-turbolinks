Tatami.extend
  handlers: [
    {
      name: "inPage"

      handler: ( page, func ) ->
        isObj = @isPlainObject page

        # 判断当前页面是否为指定页面
        if arguments.length is 1 and not isObj
          page = [page] if not @isArray page
          result = @inArray($("body").data("page"), page) > -1
        # 设置特定页面执行的函数
        else
          page = [page] if @isString page
          handlers = {}

          @each page, ( flag, idx ) =>
            if isObj
              func = flag
              flag = idx

            if not handlerExists.apply this, [flag, func]
              name = handlerName func
              
              @namespace handlers, "#{flag}.#{name}"

              handlers[flag][name] = func

            return true

          pageHandlers.set handlers

      validator: ( page, handler ) ->
        return @isString(page) or @isArray(page) or @isPlainObject(page)

      value: false
    }
  ]
, Tatami

pageHandlers = new Tatami.__class__.Storage "pageHandlers"

handlerName = ( func ) ->
  return func.toString().length.toString(16) + ""

handlerExists = ( page, func ) ->
  return @equal func, pageHandlers.get "#{page}.#{handlerName func}"

# Support for turbolinks (https://github.com/rails/turbolinks)
if @Turbolinks and @Turbolinks.supported is true
  Tatami.init
    runSandbox: ( prepareHandlers, readyHandlers ) ->
      $(document).on 
        "page:change": =>
          @each pageHandlers.storage[$("body").attr("data-page")], ( handler ) ->
            handler()

          @run prepareHandlers
        "page:load": =>
          @run readyHandlers
        "page:restore": =>
          console.log "restore"
          @run readyHandlers
