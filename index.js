//----------------------------------------------------------------------------------------------------------------------
// The main 'unisocket' object.
//
// @module index.js
//----------------------------------------------------------------------------------------------------------------------

var Promise = require('./lib/promise');
var UniSocketClient = require('./lib/client');

//----------------------------------------------------------------------------------------------------------------------

function UniSocketClientPromise(client)
{
    this._client = client;
    for(var key in UniSocketClient.prototype)
    {
        if(typeof client[key] == 'function')
        {
            this[key] = client[key].bind(client);
        }
        else
        {
            this[key] = client[key];
        } // end if
    } // end for
} // end UniSocketClientPromise

UniSocketClientPromise.prototype.then = function()
{
    return this._client.connectPromise
        .then.apply(this._client.connectPromise, arguments);
}; // end then

//----------------------------------------------------------------------------------------------------------------------

module.exports = {
    connect: function(url, options)
    {
        var callback = arguments[arguments.length - 1];
        if(typeof callback != 'function')
        {
            callback = undefined;
        }
        else
        {
            switch(arguments.length)
            {
                case 2:
                    options = undefined;
                    break;
                case 1:
                    url = undefined;
            } // end switch
        } // end if

        return new UniSocketClientPromise(new UniSocketClient(options))
            .connect(url)
            .nodeify(callback);
    },
    defaultErrorHandler: function(errorHandler)
    {
        Promise.onPossiblyUnhandledRejection(errorHandler);
    }
}; // end exports

//----------------------------------------------------------------------------------------------------------------------