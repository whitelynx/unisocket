//----------------------------------------------------------------------------------------------------------------------
// The Promise library we use internally. This keeps our default handler from interfering with other library's default
// handler, if any.
//
// @module promise.js
//----------------------------------------------------------------------------------------------------------------------

// See: https://github.com/petkaantonov/bluebird#for-library-authors
var Promise = require("bluebird/js/main/promise")();

// Enable long stack traces; must be done before any promises are made. (Incurs a large performance penalty.)
//Promise.longStackTraces();

//----------------------------------------------------------------------------------------------------------------------

module.exports = Promise;

//----------------------------------------------------------------------------------------------------------------------