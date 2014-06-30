// ---------------------------------------------------------------------------------------------------------------------
// Unit Tests for the client.spec.js module.
//
// @module client.spec.js
// ---------------------------------------------------------------------------------------------------------------------

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var assert = require("assert");

var UniSocketClient = require("../lib/client");

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
    });


    /*

    it('', function()
    {

    });

    */

});

// ---------------------------------------------------------------------------------------------------------------------