module.exports = ( grunt ) ->
  pkg = grunt.file.readJSON "package.json"
  info =
    name: pkg.name.charAt(0).toUpperCase() + pkg.name.substring(1)
    version: pkg.version
  npmTasks = [
      "grunt-contrib-coffee"
      "grunt-contrib-uglify"
    ]

  grunt.initConfig
    repo: info
    pkg: pkg
    meta:
      src: "src"
      coffee: "<%= meta.src %>/coffee"
      dest: "dest"
    coffee:
      options:
        bare: false
        separator: "\x20"
      build:
        src: "<%= meta.src %>/adaptor.coffee"
        dest: "<%= meta.dest %>/<%= pkg.name %>.js"
    uglify:
      options:
        banner: "/*!\n" +
                " * <%= repo.name %> v<%= repo.version %>\n" +
                " * <%= pkg.homepage %>\n" +
                " *\n" +
                " * Copyright 2013, <%= grunt.template.today('yyyy') %> Ourairyu, http://ourai.ws/\n" +
                " *\n" +
                " * Date: <%= grunt.template.today('yyyy-mm-dd') %>\n" +
                " */\n"
        sourceMap: true
      build:
        src: "<%= meta.dest %>/<%= pkg.name %>.js"
        dest: "<%= meta.dest %>/<%= pkg.name %>.min.js"

  grunt.loadNpmTasks task for task in npmTasks

  grunt.registerTask "script", ["coffee", "uglify"]
  grunt.registerTask "default", ["script"]
