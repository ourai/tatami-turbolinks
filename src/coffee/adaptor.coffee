turbolinksEnabled = @Turbolinks and @Turbolinks.supported is true

Storage = Tatami.__class__.Storage

# storage for page handlers
pageHandlers = new Storage "pageHandlers"

# storage for prepare handlers
prepare = new Storage "prepareHandlers"

# storage for ready handlers
ready = new Storage "readyHandlers"

currentPage = undefined

toNS = ( str ) ->
  return str.replace "-", "_"

handlerName = ( func ) ->
  return func.toString().length.toString(16) + ""

handlerExists = ( host, page, func ) ->
  name = handlerName func
  handler = host.get "#{page}.#{name}"
  existed = @equal func, handler

  # console.log(existed, handler, func) if existed and window.console

  return existed

addHandlers = ( host, page, func, isPlain ) ->
  handlers = {}

  @each page, ( flag, idx ) =>
    if isPlain
      func = flag
      flag = idx

    flag = "__GLOBAL__" if not flag?
    flag = toNS flag

    if not handlerExists.apply this, [host, flag, func]
      name = handlerName func
      
      @namespace handlers, "#{flag}.#{name}"

      handlers[flag][name] = func

  host.set handlers

runHandlers = ( handlers, callback ) ->
  @each handlers, ( handler ) ->
    callback() if callback
    handler()

runPrepareHandlers = ->
  runHandlers.call this, prepare.storage.__GLOBAL__
  runHandlers.call this, prepare.storage[currentPageFlag true]

runReadyHandlers = ->
  runHandlers.call this, ready.storage.__GLOBAL__
  runHandlers.call this, ready.storage[currentPageFlag true]

runPageHandlers = ( page, func, isPlain ) ->
  @each page, ( flag, idx ) ->
    if isPlain
      func = flag
      flag = idx

    if $("body").is "[data-page='#{flag}']"
      func()
      return false

currentPageFlag = ( convert ) ->
  page = $("body").data "page"

  return if convert is true then toNS(page) else page

Tatami.extend
  handlers: [
    {
      name: "inPage"

      handler: ( page, func ) ->
        isObj = @isPlainObject page

        # 判断当前页面是否为指定页面
        if arguments.length is 1 and not isObj
          page = [page] if not @isArray page
          result = @inArray(currentPageFlag(), page) > -1
        else
          page = [page] if @isString page
          args = [page, func, isObj]

          # 设置特定页面执行的函数
          if turbolinksEnabled
            args.unshift pageHandlers
            addHandlers.apply this, args
          # 立即执行函数
          else
            runPageHandlers.apply this, args

        return result or false

      validator: ( page, handler ) ->
        return @isString(page) or @isArray(page) or @isPlainObject(page)

      value: false
    }
  ]

# Support for turbolinks (https://github.com/rails/turbolinks)
if turbolinksEnabled
  Tatami.mixin
    prepare: ( handler ) ->
      addHandlers.call this, prepare, [currentPage], handler
      return 
    ready: ( handler ) ->
      addHandlers.call this, ready, [currentPage], handler
      return

  Tatami.init
    runSandbox: ( prepareHandlers, readyHandlers ) ->
      $(document).on 
        "page:change": =>
          console.log "change"
          page = currentPageFlag true

          runHandlers.call this, pageHandlers.storage[page], ->
            currentPage = page

          runPrepareHandlers.call this
        "page:load": =>
          console.log "load"
          runReadyHandlers.call this
        # "page:restore": =>
        #   console.log "restore"
        #   runReadyHandlers.call this
