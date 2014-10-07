//----------------------------------------------------------------------------------------------------------------------
// The main 'unisocket' object.
//
// @module index.js
//----------------------------------------------------------------------------------------------------------------------

var _ = require('lodash');

var Promise = require('./lib/promise');
var UniSocketClient = require('./lib/client');

//----------------------------------------------------------------------------------------------------------------------

module.exports = {
    connect: function(url, options)
    {
        var client = new UniSocketClient(options);
        var clientPromise =  client.connect(url);
        return _.assign(clientPromise, _.bindAll(client));
    },
    defaultErrorHandler: function(errorHandler)
    {
        Promise.onPossiblyUnhandledRejection(errorHandler);
    }
}; // end exports

if(typeof window !== 'undefined')
{
    window.unisocket = module.exports;
} // end if

//----------------------------------------------------------------------------------------------------------------------
