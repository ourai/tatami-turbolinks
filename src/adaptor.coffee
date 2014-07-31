##
# ----------
# Adaptor of Tatami for Ruby on Rails
# ----------
#= require ./tatami

turbolinksIncluded = @Turbolinks and Tatami.hasProp "supported", @Turbolinks
turbolinksEnabled = turbolinksIncluded and @Turbolinks.supported is true

# storage for page handlers
pageHandlers = new Tatami.__class__.Storage "pageHandlers"
sequence = {}

currentPage = undefined

toNS = ( str ) ->
  return str.replace "-", "_"

handlerName = ( func ) ->
  return func.toString().length.toString(16) + ""

handlerExists = ( host, page, func, name ) ->
  handler = pageHandlers.get "#{page}.#{host}.#{name}"
  existed = @equal func, handler

  # if name is handlerName handler
  #   console.log "#{name} exists", existed

  return existed

# 将函数名称添加到执行队列中
pushSeq = ( page, type, name ) ->
  seq = @namespace sequence, "#{page}.#{type}"
  seq = sequence[page][type] = [] if not seq?
  seq.push name

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
      pushSeq.apply this, [flag, host, name]

  pageHandlers.set handlers

# 执行 pageHandlers 的函数
runHandlers = ( page, type, callback ) ->
  handlers = pageHandlers.storage[page]?[type]

  if handlers
    @each sequence[page][type], ( handlerName ) ->
      callback() if callback
      handlers[handlerName]()

# 执行流程控制函数
runFlowHandlers = ( type ) ->
  pages = ["unspecified"]
  flag = currentPageFlag true
  selector = "body script[data-inside]"

  if type is "prepare" or $("#{selector}:not([data-turbolinks-eval='false'][data-loaded='true'])").size() is 0
    pages.push flag

  @each pages, ( page ) =>
    runHandlers.apply this, [page, type]

  if (scripts = $("#{selector}:not([data-turbolinks-eval='false'])")).size() > 0
    lib = this
    loaded = 0

    $(scripts).on "load", ->
      loaded++
      $(this).attr "data-loaded", true
      runHandlers.apply lib, [flag, type] if loaded is scripts.size()

# 执行页面指定初始化函数
runPageHandlers = ( page, func, isPlain ) ->
  @each page, ( flag, idx ) ->
    if isPlain
      func = flag
      flag = idx

    if $("body").is "[data-page='#{flag}']"
      func()
      return false

# 获取当前页面的标记
# 主要用于 page-specific 脚本
# 若为 undefined 则代表全局
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
          if turbolinksIncluded
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
if turbolinksIncluded
  Tatami.mixin
    prepare: ( handler ) ->
      addHandlers.call this, "prepare", [currentPage], handler
      return 
    ready: ( handler, page ) ->
      addHandlers.call this, "ready", [if page? then toNS(page) else currentPage], handler
      return

  runAllHandlers = ( context ) ->
    # console.log "Run! Run!! Run!!!"
    page = currentPageFlag true

    # 执行 init 函数队列
    # 过程中会添加页面指定的 prepare、ready 函数
    runHandlers.call context, page, "init", ->
      currentPage = page

    runFlowHandlers.call context, "prepare"
    runFlowHandlers.call context, "ready"

  Tatami.init
    runSandbox: ->
      context = this

      if turbolinksEnabled
        $(document).on
          "page:change": ->
            runAllHandlers context
          # "page:load": =>
          #   console.log "load"
      else
        $(document).ready ->
          runAllHandlers context

Tatami.adaptor =
  turbolinks: { enabled: turbolinksEnabled, pageHandlers, sequence }
