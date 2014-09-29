//----------------------------------------------------------------------------------------------------------------------
// Represents a channel.
//
// @module channel.js
//----------------------------------------------------------------------------------------------------------------------

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var _ = require("lodash");

var SimpleLogger = require('./logger');
var UniSocketClient = require('./client');

//----------------------------------------------------------------------------------------------------------------------

function UniSocketChannel(channel, parent)
{
    EventEmitter.call(this);

    this._channel = channel;
    this._parent = parent;
    this._buildProperties();
    this._connectEvents();
    this.waitingCallbacks = {};
    this.pendingMessages = [];
    this.seqId = 0;

    // Create our logger object
    this.logger = new SimpleLogger('channel');
    this.logger.silent = !!parent.silent;
} // end UniSocketChannel

util.inherits(UniSocketChannel, EventEmitter);

// Inherit from our parent
_.assign(UniSocketChannel.prototype, _.pick(UniSocketClient.prototype,
    '_handleMessage', '_getSeqId', '_send', 'send', 'request'));

UniSocketChannel.prototype._buildProperties = function()
{
    this.ws = this._parent.ws;
    this.options = this._parent.options;
    this.state = this._parent.state;
}; // end _buildProperties

UniSocketChannel.prototype._connectEvents = function()
{
    this.ws.on('message', this._handleMessage.bind(this));
}; // end _connectEvents

//----------------------------------------------------------------------------------------------------------------------

module.exports = UniSocketChannel;

//----------------------------------------------------------------------------------------------------------------------