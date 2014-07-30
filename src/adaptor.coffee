##
# ----------
# Adaptor of Tatami for Ruby on Rails
# ----------
#= require ./tatami

turbolinksEnabled = @Turbolinks and @Turbolinks.supported is true

# storage for page handlers
pageHandlers = new Tatami.__class__.Storage "pageHandlers"

currentPage = undefined

toNS = ( str ) ->
  return str.replace "-", "_"

handlerName = ( func ) ->
  return func.toString().length.toString(16) + ""

handlerExists = ( host, page, func, name ) ->
  handler = pageHandlers.get "#{page}.#{host}.#{name}"
  existed = @equal func, handler

  # console.log(existed, handler, func) if existed and window.console

  return existed

addHandlers = ( host, page, func, isPlain ) ->
  handlers = {}

  @each page, ( flag, idx ) =>
    if isPlain
      func = flag
      flag = idx

    flag = "unspecified" if not flag?
    flag = toNS flag
    name = handlerName func

    if not handlerExists.apply this, [host, flag, func, name]
      @namespace handlers, "#{flag}.#{host}.#{name}"
      handlers[flag][host][name] = func

  pageHandlers.set handlers

# 执行 pageHandlers 的函数
runHandlers = ( handlers, callback ) ->
  @each handlers, ( handler ) ->
    callback() if callback
    handler()

# 执行流程控制函数
runFlowHandlers = ( type ) ->
  pages = ["unspecified"]
  flag = currentPageFlag true

  if true #type is "prepare" or $("body script[src]:not([data-turbolinks-eval='false'][data-loaded='true'])").size() is 0
    pages.push flag

  @each pages, ( page ) =>
    runHandlers.call this, pageHandlers.storage[page]?[type]

  # if (scripts = $("body script[src]:not([data-turbolinks-eval='false'])")).size() > 0
  #   lib = this
  #   loaded = 0

  #   $(scripts).on "load", ->
  #     loaded++
  #     $(this).attr "data-loaded", true
  #     runHandlers.call lib, pageHandlers.storage[flag]?[type] if loaded is scripts.size()

# 执行页面指定初始化函数
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
            args.unshift "init"
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
      addHandlers.call this, "prepare", [currentPage], handler
      return 
    ready: ( handler ) ->
      addHandlers.call this, "ready", [currentPage], handler
      return

  Tatami.init
    runSandbox: ->
      $(document).on
        "page:before-change": ->
          console.log "before-change"
        "page:change": =>
          console.log "change"
          page = currentPageFlag true

          # 执行 init 函数队列
          # 过程中会添加页面指定的 prepare、ready 函数
          runHandlers.call this, pageHandlers.storage[page]?.init, ->
            currentPage = page

          runFlowHandlers.call this, "prepare"
          runFlowHandlers.call this, "ready"
        "page:load": =>
          console.log "load"
        # "page:restore": =>
        #   console.log "restore"
        #   runFlowHandlers.call this, "ready"
