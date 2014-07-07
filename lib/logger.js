//----------------------------------------------------------------------------------------------------------------------
// A simple logger, with a simple API that works in both the browser, and node.js.
//
// @module logger.js
//----------------------------------------------------------------------------------------------------------------------

function SimpleLogger(name)
{
    this.name = name;
    this.silent = false;
} // end Simple Logger

SimpleLogger.prototype._buildLoggingFunction = function(severity)
{
    var self = this;
    return function()
    {
        if(!self.silent)
        {
            var args = Array.prototype.slice.call(arguments);
            var message = "[" + severity.toUpperCase() + "] " + self.name + " :: " + args[0];
            if(severity.toLowerCase() == 'error')
            {
                console.error.apply(console, [message].concat(args.slice(1)));
            }
            else
            {
                console.log.apply(console, [message].concat(args.slice(1)));
            } // end if
        } // end if
    };
};

SimpleLogger.prototype.debug = function(){ this._buildLoggingFunction('debug').apply(this, arguments); };
SimpleLogger.prototype.info = function(){ this._buildLoggingFunction('info').apply(this, arguments); };
SimpleLogger.prototype.warn = function(){ this._buildLoggingFunction('warn').apply(this, arguments); };
SimpleLogger.prototype.error = function(){ this._buildLoggingFunction('error').apply(this, arguments); };

//----------------------------------------------------------------------------------------------------------------------

module.exports = SimpleLogger;

//----------------------------------------------------------------------------------------------------------------------