##
# ----------
# Adaptor of Tatami for Ruby on Rails
# ----------
#= require ./tatami

if Tatami.isPlainObject Tatami.adaptor?.rails
  return false

_T = Tatami

# storage for page handlers
pageHandlers = new _T.__class__.Storage "pageHandlers"
sequence = {}
execution = {}

currentPage = undefined
turbolinksEnabled = @Turbolinks?.supported is true

_T.mixin
  adaptor:
    rails:
      turbolinks: {enabled: turbolinksEnabled, handlers: pageHandlers.storage, sequence, execution}

if turbolinksEnabled
  # 监控动态插入的 <script>
  do ->
    method = Node::insertBefore

    loaded = 0
    scripts = 0

    onload = ->
      loaded++
      @setAttribute "data-loaded", true
      console.log this.src
      runHandlers.apply(_T, [currentPageFlag(true), "ready"]) if loaded is scripts

    Node::insertBefore = ( node ) ->
      if node.tagName.toLowerCase() is "script" and _T.data(node)["inside"]
        scripts++
        node.async = false
        node.onload = onload

      method.apply this, arguments

toNS = ( str ) ->
  return str.replace "-", "_"

handlerName = ( func ) ->
  return func.toString().length.toString(16) + ""

handlerExists = ( host, page, func, name ) ->
  return @equal func, pageHandlers.get "#{page}.#{host}.#{name}"

# 将函数名称添加到执行队列中
pushSeq = ( page, type, name ) ->
  seq = @namespace sequence, "#{page}.#{type}"
  seq = sequence[page][type] = [] if not seq?
  seq.push name

handlerStatus = ( page, type, name ) ->
  exec = @namespace execution, "#{page}.#{type}.#{name}"
  execution[page][type][name] = false if exec is null

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
      handlerStatus.apply this, [flag, host, name]

    return true

  pageHandlers.set handlers

# 执行 pageHandlers 的函数
runHandlers = ( page, type, callback ) ->
  handlers = pageHandlers.storage[page]?[type]

  if handlers
    statuses = execution[page][type]

    @each sequence[page][type], ( handlerName ) ->
      callback() if callback
      
      if page is "unspecified" or statuses[handlerName] is false
        statuses[handlerName] = true
        handlers[handlerName]()

# 执行流程控制函数
runFlowHandlers = ( type ) ->
  pages = ["unspecified"]
  flag = currentPageFlag true
  scripts = $("body script[data-inside]:not([data-turbolinks-eval='false'][data-loaded='true'])")

  if type is "prepare" or not turbolinksEnabled or scripts.size() is 0
    pages.push flag

  @each pages, ( page ) =>
    runHandlers.apply this, [page, type]

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

_T.extend
  handlers: [
    {
      ###
      # 只有一个参数并且是字符串时判断当前页面是否为指定页面
      # 否则添加指定页面的执行函数
      # 
      # @method   inPage
      # @param    page {String/Array/Object}    指定页面的标记
      # @param    [func] {Function}             回调函数
      # @param    [stack] {Boolean}             将回调函数加入函数队列
      # @return   {Boolean}
      ###
      name: "inPage"

      handler: ( page, func, stack ) ->
        isObj = @isPlainObject page

        # 判断当前页面是否为指定页面
        if arguments.length is 1 and not isObj
          page = [page] if not @isArray page
          result = @inArray(currentPageFlag(), page) > -1
        else
          page = [page] if @isString page
          args = [page, func, isObj]

          # 设置特定页面执行的函数
          if stack is true or not document.body?
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
if _T.hasProp "supported", @Turbolinks
  changeable = true

  _T.mixin
    prepare: ( handler ) ->
      addHandlers.call this, "prepare", [currentPage], handler
      return 
    ready: ( handler, page ) ->
      addHandlers.call this, "ready", [if page? then toNS(page) else currentPage], handler
      return

  runAllHandlers = ->
    console.log "Run! Run!! Run!!!"
    page = currentPageFlag true

    # 执行 init 函数队列
    # 过程中会添加页面指定的 prepare、ready 函数
    runHandlers.call this, page, "init", ->
      currentPage = page

    runFlowHandlers.call this, "prepare"
    runFlowHandlers.call this, "ready"

  # Same to jQuery Turbolinks (https://github.com/kossnocorp/jquery.turbolinks)
  $doc = $(document)
  adaptor =
    isReady: false

    use: ( load, fetch, expire ) ->
      $doc
        .off ".adaptor"
        .on "#{load}.adaptor", @onLoad
        .on "#{fetch}.adaptor", @onFetch
        .on "#{expire}.adaptor", @onExpire

    addCallback: ( callback ) ->
      if adaptor.isReady
        callback $
      else
        $doc.on "adaptor:ready", ->
          callback $

    onLoad: ->
      adaptor.isReady = true
      $doc.trigger "adaptor:ready"

    onFetch: ->
      adaptor.isReady = false

    onExpire: ( page ) ->
      console.log "page #{page.url} is expired"
      delete execution[toNS $(page.body).data("page")]

    register: ->
      $(@onLoad)
      $.fn.ready = @addCallback

  _T.init
    runSandbox: ->
      adaptor.register()
      adaptor.use "page:load", "page:fetch", "page:expire"

      $doc.ready =>
        runAllHandlers.call this
