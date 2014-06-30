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

//----------------------------------------------------------------------------------------------------------------------

function UniSocketClient(options)
{
    EventEmitter.call(this);

    // Store our options
    this.options = options || {};

    // Hold on to waiting callback
    this.waitingCallbacks = {};

    // Internal sequence id for request/response. Only needs to be unique per instance, for the duration of the time it
    // takes to fulfill the request.
    this.seqId = 0;

    // Track our internal state
    this.state = 'closed';
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
    console.error('Websocket Error:', error);
}; // end _handleError

UniSocketClient.prototype._handleMessage = function(messageEvent)
{
    var message = JSON.parse(messageEvent.data);

    // Make sure message.data is a list
    message.data = message.data || [];

    // Handle the multiple names for the root channel
    if((message.channel == '/') || (message.channel == ''))
    {
        message.channel = undefined;
    } // end if

    // Only process this message if it's for our channel
    if(message.channel == this.channel || message.channel == '$control')
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
                console.error("'replyTo' without matching callback.");
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
    var args = Array.prototype.slice.call(arguments);

    // Build message envelope
    var message = {
        name: args[0],
        channel: this.channel,
        data: args.slice(1)
    }; // end message

    // Send the message
    this.ws.send(JSON.stringify(message));
}; // end send

UniSocketClient.prototype.request = function()
{
    var self = this;

    // The arguments object is a pain to work with, but this puts it into a real array
    var args = Array.prototype.slice.call(arguments);

    // Build message envelope
    var message = {
        name: args[0],
        channel: this.channel,
        data: args.slice(1)
    }; // end message

    var callback = args[args.length - 1];
    if(typeof callback != 'function')
    {
        callback = undefined;
    } // end if

    return new Promise(function(resolve, reject)
    {
        message.replyWith = this._getSeqId();
        message.data.splice(message.data.length - 1, 1);

        // Set up timeout handler
        var handle = setTimeout(function()
        {
            // Handle timeout
            console.error("Timeout waiting for response.");
            self.emit("timeout", message);

            // Reject the promise
            reject();
        }, self.options.timeout || 30000);

        // Store callback
        self.waitingCallbacks[message.replyWith] = function()
        {
            // Cancel Timeout
            clearTimeout(handle);

            // Resolve the promise
            resolve();
        };
    }).nodeify(callback);
}; // end request

UniSocketClient.prototype.channel = function(channel, callback)
{
    var channelClient = new UniSocketChannel(channel, this);

    return new Promise(function(resolve)
    {
        // Send a special message to the server to let it know we've connected on a channel.
        client.ws.send(JSON.stringify({
            name: 'channel',
            channel: '$control',
            replyWith: client._getSeqId(),
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