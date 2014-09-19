//----------------------------------------------------------------------------------------------------------------------
// RFI Client Gruntfile.
//----------------------------------------------------------------------------------------------------------------------

module.exports = function(grunt)
{
    // Project configuration.
    grunt.initConfig({
        browserify: {
            devel: {
                files: {
                    'dist/unisocket.js': ['index.js']
                }
            }
        },
        watch: {
            browserify: {
                files: ['index.js', 'lib/**/*.js'],
                tasks: ['browserify'],
                options: {
                    atBegin: true
                }
            }
        }
    });

    // Grunt Tasks.
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');

    // Setup the build task.
    grunt.registerTask('build', ['browserify']);
}; // module.exports

// ---------------------------------------------------------------------------------------------------------------------
