// karma.conf.js
module.exports = function(config) {
    config.set({
        frameworks: ['mocha', 'chai', 'sinon'],

        files: [
            'src/*.js',
            'test/*.js'
        ],
        browsers: ['Chrome'],
        reporters: ['mocha'],
        singleRun: true
   });
};