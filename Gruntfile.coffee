module.exports = ( grunt ) ->
  pkg = grunt.file.readJSON "package.json"
  info =
    name: pkg.name.charAt(0).toUpperCase() + pkg.name.substring(1)
    version: pkg.version
  npmTasks = [
      "grunt-contrib-concat"
      "grunt-contrib-coffee"
      "grunt-contrib-uglify"
      "grunt-contrib-copy"
      "grunt-contrib-clean"
      "grunt-contrib-jasmine"
    ]

  grunt.initConfig
    repo: info
    pkg: pkg
    meta:
      src: "src"
      coffee: "<%= meta.src %>/coffee"
      dest: "dest"
      dest_style: "<%= meta.dest %>/stylesheets"
      dest_script: "<%= meta.dest %>"
      dest_image: "<%= meta.dest %>/images"
      build: "build"
      tests: "<%= meta.build %>/tests"
      tasks: "<%= meta.build %>/tasks"
    concat:
      coffee:
        src: [
            "<%= meta.coffee %>/adaptor.coffee"
          ]
        dest: "<%= meta.dest_script %>/<%= pkg.name %>.coffee"
      js:
        options:
          process: ( src, filepath ) ->
            return src.replace /@(NAME|VERSION)/g, ( text, key ) ->
              return info[key.toLowerCase()]
        src: [
            "<%= meta.src %>/<%= pkg.name %>.js"
          ],
        dest: "<%= meta.dest_script %>/<%= pkg.name %>.js"
    coffee:
      options:
        bare: true
        separator: "\x20"
      build:
        src: "<%= meta.coffee %>/adaptor.coffee"
        dest: "<%= meta.src %>/<%= pkg.name %>.js"
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
        src: "<%= meta.dest_script %>/<%= pkg.name %>.js"
        dest: "<%= meta.dest_script %>/<%= pkg.name %>.min.js"
    copy:
      build:
        expand: true
        cwd: "<%= meta.dest %>"
        src: ["**.js", "**.css", "**/*.scss"]
        dest: "dest"
      test:
        expand: true
        cwd: "<%= meta.dest_script %>"
        src: ["**.js"]
        dest: "<%= meta.tests %>"
    clean:
      compiled:
        src: ["<%= meta.dest_script %>/*.coffee"]
    jasmine:
      test:
        src: "<%= meta.tests %>/<%= pkg.name %>.js"
        options:
          specs: "<%= meta.tests %>/*Spec.js"
          vendor: [
              "<%= meta.tests %>/ronin.js"
              "<%= meta.tests %>/jquery.js"
            ]

  grunt.loadNpmTasks task for task in npmTasks

  grunt.registerTask "script", ["coffee", "concat:js", "uglify"]
  grunt.registerTask "default", ["script", "clean", "copy:test"]
