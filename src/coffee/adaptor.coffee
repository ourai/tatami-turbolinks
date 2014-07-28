# Support for turbolinks (https://github.com/rails/turbolinks)
if Turbolinks and Turbolinks.supported is true
  Tatami.data "__pageHandlers", {}

  # 执行通过 .isPage 绑定的函数
  runPageHandlers = () ->
    @each @data("__pageHandlers")[$("body").attr("data-page")], ( handler ) ->
      handler()

  Tatami.init
    runSandbox: ( prepareHandlers, readyHandlers ) ->
      $(document).on 
        "page:change": =>
          runPageHandlers.call this
          @run prepareHandlers
        "page:load": =>
          @run readyHandlers
        "page:restore": =>
          console.log "restore"
          @run readyHandlers
