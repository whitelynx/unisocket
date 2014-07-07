//----------------------------------------------------------------------------------------------------------------------
// Brief description for client.js module.
//
// @module client.js
//----------------------------------------------------------------------------------------------------------------------

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var WebSocket = require('ws');

var UniSocketChannel = require('./channel');
var Promise = require('./promise');
var urlParser = require('./urlparser');
var SimpleLogger = require('./logger');

//----------------------------------------------------------------------------------------------------------------------

function UniSocketClient(options)
{
    EventEmitter.call(this);

    // Our channel is always undefined
    this._channel = undefined;

    // Store our options
    this.options = options || {};

    // Hold on to waiting callback
    this.waitingCallbacks = {};

    // Internal sequence id for request/response. Only needs to be unique per instance, for the duration of the time it
    // takes to fulfill the request.
    this.seqId = 0;

    // Track our internal state
    this.state = 'closed';

    // Create our logger object
    this.logger = new SimpleLogger('client');
    this.logger.silent = !!this.options.silent;
} // end UniSocketClient

util.inherits(UniSocketClient, EventEmitter);

//----------------------------------------------------------------------------------------------------------------------
// Internal API
//----------------------------------------------------------------------------------------------------------------------

UniSocketClient.prototype._getSeqId = function()
{
    this.seqId++;
    return this.seqId.toString();
}; // end _getSeqId

UniSocketClient.prototype._cleanup = function()
{
    if(this.ws)
    {
        this.url = undefined;

        // Cleanup our websocket instance
        this.ws.close();

        // Give the close event a chance to propagate
        setImmediate(this.ws.removeAllListeners.bind(this.ws));
        this.ws = undefined;
    } // end if
}; // end _cleanup

UniSocketClient.prototype._handleDisconnect = function()
{
    var self = this;
    this.emit('disconnected');

    if(this.reconnect)
    {
        var url = this.url;
        this.state = 'reconnecting';
        this._cleanup();

        // Only set this if it's not set
        this.disconnectMS = this.disconnectMS || Date.now();
        var diff = (Date.now() - this.disconnectMS) / 1000;

        if(diff <= 30)
        {
            this.connect(url);
        }
        else if(diff <= 120)
        {
            setTimeout(function()
            {
                self.connect(url);
            }, 15000);
        }
        else if(diff <= 300)
        {
            setTimeout(function()
            {
                self.connect(url);
            }, 30000);
        }
        else
        {
            setTimeout(function()
            {
                self.connect(url);
            }, 60000);
        } // end if
    }
    else
    {
        this.state = 'closed';
    } // end if
}; // end _handleDisconnect

UniSocketClient.prototype._handleError = function(error)
{
    this.logger.error('Websocket Error:', error);
}; // end _handleError

UniSocketClient.prototype._handleMessage = function(message)
{
    message = JSON.parse(message);

    // Make sure message.data is a list
    message.data = message.data || [];

    // Handle the multiple names for the root channel
    if((message.channel == '/') || (message.channel == ''))
    {
        message.channel = undefined;
    } // end if

    // Only process this message if it's for our channel
    if(message.channel == this._channel || message.channel == '$control')
    {
        // Reply Support
        if (message.replyTo)
        {
            var callback = this.waitingCallbacks[message.replyTo];
            if (callback)
            {
                callback.apply(this, message.data);
            }
            else
            {
                // We don't have a callback for channel messages
                if(message.name != 'channel' || message.channel != '$control')
                {
                    this.logger.error("'replyTo' without matching callback.");
                } // end if
            } // end if
        }
        else
        {
            // Emit a custom event with the name of the message
            this.emit.apply(this, [message.name].concat(message.data));
        } // end if
    } // end if
}; // end _handleMessage

//----------------------------------------------------------------------------------------------------------------------
// Public API
//----------------------------------------------------------------------------------------------------------------------

UniSocketClient.prototype.connect = function(url)
{
    var self = this;

    if(this.state != 'closed' && this.url != url)
    {
        this.close();
    } // end if

    if(this.state != 'closed' && this.state != 'reconnecting')
    {
        return this.connectPromise;
    }
    else
    {
        // Ensure we have a clean state.
        this._cleanup();
        if(this.state != 'reconnecting')
        {
            this.state = 'connecting';
        } // end if

        // Normalize our url to a `ws://` or `wss://` url
        this.url = urlParser.normalize(url);

        // Re-enable reconnection
        this.reconnect = true;

        // Support mocking/unit testing
        if(this.options.FakeSocket)
        {
            this.ws = new this.options.FakeSocket(this.url);
        }
        else
        {
            this.ws = new WebSocket(this.url);
        } // end if

        // Store the connect promise on our instance, so we can use it in `then`
        this.connectPromise = new Promise(function(resolve, reject)
        {
            // If we get an error before we've connected, reject the promise
            self.ws.once('error', reject);

            // Register websocket events
            self.ws.once('open', function()
            {
                resolve(self);

                // Remove our 'on connection' error handler
                //self.ws.removeListener('error', reject);

                if(self.state == 'reconnecting')
                {
                    self.state = 'connected';
                    self.emit('reconnected');
                }
                else
                {
                    self.state = 'connected';
                    self.emit('connected');
                } // end if
            });

            self.ws.on('error', self._handleError.bind(self));
            self.ws.on('message', self._handleMessage.bind(self));
            self.ws.once('close', self._handleDisconnect.bind(self));
        });

        return this.connectPromise;
    } // end if
}; // end connect

UniSocketClient.prototype.send = function()
{
    // The arguments object is a pain to work with, but this puts it into a real array
    var args = Array.prototype.slice.call(arguments, 1);

    // Build message envelope
    var message = {
        name: arguments[0],
        channel: this._channel,
        data: args
    }; // end message

    // Send the message
    this.ws.send(JSON.stringify(message));
}; // end send

UniSocketClient.prototype.request = function()
{
    var self = this;

    // The arguments object is a pain to work with, but this puts it into a real array
    var args = Array.prototype.slice.call(arguments, 1);

    // Build message envelope
    var message = {
        name: arguments[0],
        replyWith: this._getSeqId(),
        channel: this._channel,
        data: args.splice(args.length - 1, 1)
    }; // end message

    var callback = args[args.length - 1];
    if(typeof callback != 'function')
    {
        callback = undefined;
    } // end if

    var promise = new Promise(function(resolve, reject)
    {
        // Set up timeout handler
        var handle = setTimeout(function()
        {
            // Handle timeout
            self.logger.error("Timeout waiting for response.");
            self.emit("timeout", message);

            // Reject the promise
            reject(new Error("Timeout waiting for response."));
        }, self.options.timeout || 30000);

        // Store callback
        self.waitingCallbacks[message.replyWith] = function()
        {
            // Cancel Timeout
            clearTimeout(handle);

            // fix arguments array
            var args = Array.prototype.slice.call(arguments);

            // Resolve the promise
            resolve(args);
        };
    }).nodeify(callback, { spread: true });

    // Send the message
    this.ws.send(JSON.stringify(message));

    return promise;
}; // end request

UniSocketClient.prototype.channel = function(channel, callback)
{
    var self = this;
    var channelClient = new UniSocketChannel(channel, this);

    return new Promise(function(resolve)
    {
        // Send a special message to the server to let it know we've connected on a channel.
        self.ws.send(JSON.stringify({
            name: 'channel',
            channel: '$control',
            replyWith: self._getSeqId(),
            data: [channel]
        }));

        resolve(channelClient);
    }).nodeify(callback);
}; // end channel

UniSocketClient.prototype.close = function()
{
    if(this.state != 'closed')
    {
        // Stop any attempts to reconnect; and cleanup.
        this.reconnect = false;
        this._cleanup();

        this.emit('closed');
    } // end if
}; // end close

//----------------------------------------------------------------------------------------------------------------------

module.exports = UniSocketClient;

//----------------------------------------------------------------------------------------------------------------------