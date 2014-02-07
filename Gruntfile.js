'use strict';

module.exports = function (grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint : {
      all     : ['Gruntfile.js', 'tasks/*.js', '<%= nodeunit.tests %>', ],
      options : {
        jshintrc : '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    // clean : {
    //   tests : ['tmp'],
    // },

    // Configuration to be run (and then tested).
    spritepacker : {
      default_options : {
        options : {
          template  : 'files/sprites.css.tpl',
          destCss   : 'tmp/sprites.css',
          baseUrl   : 'files/images/',
          padding   : 2,
          cssConfig : 'files/sprite.json'
        },
        files: {
          'tmp/sprites.png' : ['files/images/sprites/*.png']
        }
      }
    },

    // Unit tests.
    nodeunit : {
      tests : ['test/*_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['spritepacker', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['spritepacker']);

};
