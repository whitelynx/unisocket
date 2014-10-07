// ---------------------------------------------------------------------------------------------------------------------
// Brief Description of websocket.js.
//
// @module websocket.js
// ---------------------------------------------------------------------------------------------------------------------

var util = require('util');

var EventEmitter = require('events').EventEmitter;

// ---------------------------------------------------------------------------------------------------------------------

if(typeof window !== 'undefined')
{
    // Disable jshint warning about declaring functions inside blocks:
    //jshint -W082

    // -----------------------------------------------------------------------------------------------------------------

    function WebSocketWrapper(url, protocols)
    {
        EventEmitter.call(this);

        this.ws = new WebSocket(url, protocols);
        this.ws.onopen = this._wrapEventFunction('open');
        this.ws.onclose = this._wrapEventFunction('close');
        this.ws.onerror = this._wrapEventFunction('error');
        this.ws.onmessage = this._onMessage.bind(this);
    } // end WebSocketWrapper

    util.inherits(WebSocketWrapper, EventEmitter);

    WebSocketWrapper.prototype._wrapEventFunction = function(eventName)
    {
        var self = this;
        return function(event){ self.emit(eventName, event); }.bind(self);
    }; // end _wrapEventFunction

    WebSocketWrapper.prototype._onMessage = function(event)
    {
        this.emit('message', event.data);
    }; // end _onMessage

    WebSocketWrapper.prototype.send = function(message)
    {
        this.ws.send(message);
    }; // end send

    WebSocketWrapper.prototype.close = function(code, reason)
    {
        this.ws.close(code, reason);
    }; // end close

    // -----------------------------------------------------------------------------------------------------------------

    module.exports = WebSocketWrapper;
}
else
{
    module.exports = require('ws');
} // end if

// ---------------------------------------------------------------------------------------------------------------------
