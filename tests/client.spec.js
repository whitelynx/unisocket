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

function FakeSocket()
{
    EventEmitter.call(this);
    this.state = "OPENED";
    setTimeout(function()
    {
        this.emit('open');
    }.bind(this), 10);
} // end FakeSocketServer
util.inherits(FakeSocket, EventEmitter);
FakeSocket.prototype.send = function(data){this.emit('send', data); };
FakeSocket.prototype.close = function(){ this.state = 'CLOSED'; this.emit('close'); };

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

        it.skip('fires a \'timeout\' event if it fails to connect in time', function()
        {
            //TODO: Implement
        });

        it.skip('queues messages and requests while reconnecting', function()
        {
            //TODO: Implement
        });

        it.skip('throws away queued messages if close is called before it successfully reconnects', function()
        {
            //TODO: Implement
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
                    assert.deepEqual(JSON.parse(message), { name:"test", replyWith:"1", data:[] });
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
                    assert.deepEqual(JSON.parse(message), { name:"test", replyWith:"1", data:[] });
                    client.ws.emit('message', "{\"name\":\"test\",\"replyTo\":\"1\",\"data\":[]}");
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
                    assert.deepEqual(JSON.parse(message), { name:"test", replyWith:"1", data:[] });
                    client.ws.emit('message', "{\"name\":\"test\",\"replyTo\":\"1\",\"data\":[{\"foo\":true},[{\"bar\":false}]]}");
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
                        client.ws.emit('message', "{\"name\":\"channel\",\"channel\":\"$control\",\"replyTo\":\"1\",\"data\":[]}")
                    }
                    else
                    {
                        assert.equal(message, "");
                        done()
                    } // end if
                });

                client.channel('test').then(function(channel)
                {
                    channel.send('test');
                });
            });
        });

        it.skip('fires events when messages come in on the channel', function()
        {
            //TODO: Implement
        });
    });
});

// ---------------------------------------------------------------------------------------------------------------------