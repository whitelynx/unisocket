//----------------------------------------------------------------------------------------------------------------------
// Represents a channel.
//
// @module channel.js
//----------------------------------------------------------------------------------------------------------------------

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var SimpleLogger = require('./logger');

//----------------------------------------------------------------------------------------------------------------------

function UniSocketChannel(channel, parent)
{
    EventEmitter.call(this);

    this._channel = channel;
    this._parent = parent;
    this._buildProperties();
    this._connectEvents();
    this.waitingCallbacks = [];

    // Create our logger object
    this.logger = new SimpleLogger('channel');
    this.logger.silent = !!parent.silent;
} // end UniSocketChannel

util.inherits(UniSocketChannel, EventEmitter);

UniSocketChannel.prototype._buildProperties = function()
{
    // We want to inherit a lot from our parent, however, we don't want things like connection logic,
    // connect, close, etc. The safer option is to just bind to our parent's functions for what we need.
    Object.defineProperties(this, {
        _handleMessage: { get: function() { return this._parent._handleMessage; } },

        ws: { get: function() { return this._parent.ws; } },
        state: { get: function() { return this._parent.state; } },
        send: { get: function() { return this._parent.send; } },
        request: { get: function() { return this._parent.request; } }
    });
}; // end _buildProperties

UniSocketChannel.prototype._connectEvents = function()
{
    this.ws.on('message', this._handleMessage.bind(this));
}; // end _connectEvents

//----------------------------------------------------------------------------------------------------------------------

module.exports = UniSocketChannel;

//----------------------------------------------------------------------------------------------------------------------