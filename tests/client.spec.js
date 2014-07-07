// ---------------------------------------------------------------------------------------------------------------------
// Unit Tests for the client.spec.js module.
//
// @module client.spec.js
// ---------------------------------------------------------------------------------------------------------------------

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var assert = require("assert");

var UniSocketClient = require("../lib/client");
var UniSocketChannel = require("../lib/channel");

// ---------------------------------------------------------------------------------------------------------------------

function FakeSocket(options)
{
    var self = this;
    EventEmitter.call(this);

    this.autoHandle = options.autoHandle === undefined ? true : options.autoHandle;

    if(this.autoHandle)
    {
        setTimeout(function()
        {
            this.emit('open');
        }.bind(this), 10);
    } // end if

    this.on('send', function(message)
    {
        message = JSON.parse(message);

        // Automatically handle $control messages
        if(message.channel == '$control' && self.autoHandle)
        {
            switch(message.name)
            {
                case 'connect':
                    message.replyTo = message.replyWith;
                    delete message.replyWith;
                    message.data = [{}];

                    setTimeout(function()
                    {
                        self.emit('message', JSON.stringify(message));
                    }, 10);
                    break;
            } // end switch
        } // end if
    });
} // end FakeSocketServer
util.inherits(FakeSocket, EventEmitter);
FakeSocket.prototype.send = function(data){this.emit('send', data); };
FakeSocket.prototype.close = function(){ this.emit('close'); };

// ---------------------------------------------------------------------------------------------------------------------

describe('UniSocketClient', function()
{
    var client;
    beforeEach(function()
    {
        client = new UniSocketClient({ FakeSocket: FakeSocket });
    });

    describe('Connection', function()
    {
        it('returns a promise', function(done)
        {
            client.connect().then(function(client)
            {
                assert(client instanceof UniSocketClient);
                done();
            }).error(function()
            {
                assert(false);
                done();
            });
        });

        it('fires "connected" event once it connects', function(done)
        {
            client.connect();
            client.on('connected', function()
            {
                done();
            });
        });

        it('connects to a different server when you call connect with a different url', function(done)
        {
            client.connect().then(function()
            {
                assert(client.url, "ws://localhost:80");

                // Do it a second time, with a new url
                client.connect('localhost:4000').then(function()
                {
                    assert(client.url, "ws://localhost:4000");
                    done();
                });
            });
        });

        it('fires a \'timeout\' event if it fails to connect in time', function(done)
        {
            client.logger.silent = true;
            client.options.connectTimeout = 30;
            client.options.autoHandle = false;

            client.connect().then(function()
            {
                assert(false, "Successfully connected.");
            }).error(function()
            {
                done();
            });
        });
    }); // end describe#connect()

    describe('Reconnection', function()
    {
        it('reconnects if connection was lost', function(done)
        {
            client.on('reconnected', function()
            {
                done();
            });

            client.connect().then(function()
            {
                setTimeout(function()
                {
                    client.ws.close();
                }, 20);
            });
        });

        it('doesn\'t reconnect if close was called', function(done)
        {
            client.on('reconnected', function()
            {
                assert(false, "The 'reconnected' event was fired.");
                done();
            });

            client.on('closed', function()
            {
                done();
            });

            client.connect().then(function()
            {
                setTimeout(function()
                {
                    client.close();
                }, 20);
            });
        });

        it('queues messages and requests while reconnecting', function(done)
        {
            client.connect().then(function()
            {
                client.on('reconnected', function()
                {
                    client.ws.on('send', function(message)
                    {
                        assert.equal(message, "{\"name\":\"test\",\"data\":[]}");
                        done()
                    });
                });

                setTimeout(function()
                {
                    client.ws.close();
                    client.send('test');
                    assert.equal(client.pendingMessages.length, 1);
                }, 20);
            });
        });

        it('throws away queued messages if close is called before it successfully reconnects', function(done)
        {
            client.once('closed', function()
            {
                assert.equal(client.pendingMessages.length, 0);
                done();
            });

            client.connect().then(function()
            {
                setTimeout(function()
                {
                    client.options.autoHandle = false;
                    client.ws.close();
                    client.send('test');

                    assert.equal(client.pendingMessages.length, 1);
                    client.close();
                }, 20);
            });
        });
    });

    describe('Messages', function()
    {
        it('sends messages', function(done)
        {
            client.connect().then(function()
            {
                client.ws.on('send', function(message)
                {
                    assert.equal(message, "{\"name\":\"test\",\"data\":[]}");
                    done()
                });

                client.send('test');
            });
        });

        it('sends messages with data', function(done)
        {
            client.connect().then(function()
            {
                client.ws.on('send', function(message)
                {
                    assert.equal(message, "{\"name\":\"test\",\"data\":[{\"foo\":true},[{\"bar\":false}]]}");
                    done()
                });

                client.send('test', {foo: true}, [{bar: false}]);
            });
        });

        it('fires events for incoming messages', function(done)
        {
            client.connect().then(function()
            {
                client.on('test', function()
                {
                    done()
                });

                client.ws.emit('message', "{\"name\":\"test\",\"data\":[]}");
            });
        });

        it('fires events with data for incoming messages', function(done)
        {
            client.connect().then(function()
            {
                client.on('test', function(arg1, arg2)
                {
                    assert.deepEqual(arg1, { foo: true });
                    assert.deepEqual(arg2, [{ bar: false }]);
                    done()
                });

                client.ws.emit('message', "{\"name\":\"test\",\"data\":[{\"foo\":true},[{\"bar\":false}]]}");
            });
        });
    });

    describe('Requests', function()
    {
        it('adds \'replyWith\' field', function(done)
        {
            client.connect().then(function()
            {
                client.ws.on('send', function(message)
                {
                    assert.deepEqual(JSON.parse(message), { name:"test", replyWith:"2", data:[] });
                    done()
                });

                client.request('test');
            });
        });

        it('calls reply handlers when the reply comes in', function(done)
        {
            client.connect().then(function()
            {
                client.ws.on('send', function(message)
                {
                    assert.deepEqual(JSON.parse(message), { name:"test", replyWith:"2", data:[] });
                    client.ws.emit('message', "{\"name\":\"test\",\"replyTo\":\"2\",\"data\":[]}");
                });

                client.request('test').then(function()
                {
                    done();
                });
            });
        });

        it('calls reply handlers with reply data', function(done)
        {
            client.connect().then(function()
            {
                client.ws.on('send', function(message)
                {
                    assert.deepEqual(JSON.parse(message), { name:"test", replyWith:"2", data:[] });
                    client.ws.emit('message', "{\"name\":\"test\",\"replyTo\":\"2\",\"data\":[{\"foo\":true},[{\"bar\":false}]]}");
                });

                client.request('test').spread(function(arg1, arg2)
                {
                    assert.deepEqual(arg1, { foo: true });
                    assert.deepEqual(arg2, [{ bar: false }]);
                    done();
                });
            });
        });

        it('triggers a timeout if a reply doesn\'t occur in the configured timeout window', function(done)
        {
            client.logger.silent = true;
            client.options.timeout = 30;

            client.on('timeout', function()
            {
                done()
            });

            client.connect().then(function()
            {
                client.request('test').error(function(){});
            });
        });
    });

    describe('Channels', function()
    {
        it('creates a new channel object', function(done)
        {
            client.connect().then(function()
            {
                client.channel('test').then(function(channel)
                {
                    assert(channel instanceof UniSocketChannel);
                    done();
                });
            });
        });

        it('sends on the correct channel', function(done)
        {
            client.connect().then(function()
            {
                client.ws.on('send', function(message)
                {
                    var msgObj = JSON.parse(message);
                    if(msgObj.channel == '$control')
                    {
                        client.ws.emit('message', "{\"name\":\"channel\",\"channel\":\"$control\",\"replyTo\":\"2\",\"data\":[]}")
                    }
                    else
                    {
                        assert.equal(message, "{\"name\":\"test\",\"channel\":\"test\",\"data\":[]}");
                        done()
                    } // end if
                });

                client.channel('test').then(function(channel)
                {
                    channel.send('test');
                });
            });
        });

        it('fires events when messages come in on the channel', function(done)
        {
            client.connect().then(function()
            {
                client.ws.on('send', function(message)
                {
                    var msgObj = JSON.parse(message);
                    if(msgObj.channel == '$control')
                    {
                        client.ws.emit('message', "{\"name\":\"channel\",\"channel\":\"$control\",\"replyTo\":\"2\",\"data\":[]}")
                    } // end if
                });

                client.channel('test').then(function(channel)
                {
                    channel.on('test', function()
                    {
                        done()
                    });

                    channel.ws.emit('message', "{\"name\":\"test\",\"channel\":\"test\",\"data\":[]}");
                });
            });
        });
    });
});

// ---------------------------------------------------------------------------------------------------------------------