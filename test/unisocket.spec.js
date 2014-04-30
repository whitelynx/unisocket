// ---------------------------------------------------------------------------------------------------------------------
// Unit Tests for UniSocket
//
// @module unisocket.spec.js
// ---------------------------------------------------------------------------------------------------------------------

function simulateConnect(socket)
{
    socket.ws.onopen();
    socket.ws.onmessage({
        data: '{"name":"connect","channel":"$control","replyTo":"1","data":[{"timeout": 30000}]}'
    });
} // end SimulateConnect

// ---------------------------------------------------------------------------------------------------------------------

describe('UniSocket Client', function ()
{
    var socket;
    var dummySocket;
    beforeEach(function()
    {
        // Mock up the websocket object.
        dummySocket = { send : sinon.spy() };
        sinon.stub(window, 'WebSocket').returns(dummySocket);

        // Setup default socket
        socket = unisocket.connect();
        simulateConnect(socket);
    });

    afterEach(function()
    {
        // Restore the WebSocket object.
        window.WebSocket.restore();
    });

    it('connects without arguments', function()
    {
        socket = unisocket.connect();
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost'));
    });

    it('connects with a hostname', function()
    {
        socket = unisocket.connect('localhost');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost'));

        // Check that socket.io style urls also work
        socket = unisocket.connect('http://localhost');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost'));
    });

    it('connects with a channel', function()
    {
        socket = unisocket.connect('/test');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost'));

        simulateConnect(socket);
        assert.equal('/test', socket.channel);
    });

    it('connects with a hostname and port', function()
    {
        socket = unisocket.connect('localhost:4000');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost:4000'));

        // Check that socket.io style urls also work
        socket = unisocket.connect('http://localhost:4000');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost:4000'));
    });

    it('connects with a hostname and channel', function()
    {
        socket = unisocket.connect('localhost/test');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost'));

        simulateConnect(socket);
        assert.equal('/test', socket.channel);

        // Check that socket.io style urls also work
        socket = unisocket.connect('http://localhost/test');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost'));

        simulateConnect(socket);
        assert.equal('/test', socket.channel);
    });

    it('connects with a hostname and port and channel', function()
    {
        socket = unisocket.connect('localhost:4000/test');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost:4000'));

        simulateConnect(socket);
        assert.equal('/test', socket.channel);

        // Check that socket.io style urls also work
        socket = unisocket.connect('http://localhost:4000/test');
        assert(WebSocket.calledWithNew());
        assert(WebSocket.calledWith('ws://localhost:4000'));

        simulateConnect(socket);
        assert.equal('/test', socket.channel);
    });

    it('sends messages with `emit` function', function()
    {
        socket.emit('test');
        assert(socket.ws.send.calledWith('{"name":"test","data":[]}'));
    });

    it('supports messages with spaces in their names', function()
    {
        socket.emit('test with spaces');
        assert(socket.ws.send.calledWith('{"name":"test with spaces","data":[]}'));
    });

    it('supports arguments when sending messages with `emit` function', function()
    {
        socket.emit('test', "Some data.");
        assert(socket.ws.send.calledWith('{"name":"test","data":["Some data."]}'));
    });

    it('calls message handler callbacks registered with `on` function', function(done)
    {
        socket.on('test', function()
        {
            done();
        });

        socket.ws.onmessage({ data: '{"name":"test","data":[]}' });
    });

    it('passes arguments to message handler callbacks registered with `on` function', function(done)
    {
        socket.on('test', function(data)
        {
            assert.equal(data, "Some data.");
            done();
        });

        socket.ws.onmessage({ data: '{"name":"test","data":["Some data."]}' });
    });

    describe('Channel Support', function()
    {
        it('returns a `UniSocketClient` object setup with the correct channel when passing a channel to `connect`', function()
        {
            socket = unisocket.connect('/test');
            simulateConnect(socket);
            assert.equal(socket.channel, '/test');
        });

        it('message handlers registered with a channeled `UniSocketClient` get called when messages are passed on that channel', function(done)
        {
            socket = unisocket.connect('/test');
            socket.on('test message', function(data)
            {
                assert.equal(data, "Some data.");
                done();
            });

            simulateConnect(socket);
            socket.ws.onmessage({ data: '{"name":"test message","channel":"/test", "data": ["Some data."]}'});
        });

        it('message handlers registered with a channeled `UniSocketClient` do not get call for messages on other channels', function(done)
        {
            socket = unisocket.connect('/test');
            socket.on('test message', function(data)
            {
                assert(false, "Channeled handler called for non-channeled message.");
            });

            setTimeout(done, 20);

            simulateConnect(socket);
            socket.ws.onmessage({ data: '{"name":"test message","data": ["Some data."]}'});
        });
    });

    describe('Reply Support', function()
    {
        it('messages emitted with a callback function as the last argument contain a `replyWith` field', function()
        {
            socket.emit('test', "Some data.", function(){});
            assert(socket.ws.send.calledWith('{"name":"test","data":["Some data."],"replyWith":"2"}'));
        });

        it("triggers a timeout if a reply isn't sent within the configured timeout.", function(done)
        {
            // shorten the timeout interval
            socket.options.timeout = 10;

            socket.emit('test', function(){});
            socket.on('timeout', function()
            {
                done();
            });
        });

        it('callbacks passed as the last argument to `emit` get called with their replies', function(done)
        {
            socket.emit('test', "Some data.", function(data)
            {
                assert.equal(data, "Some data.");
                done();
            });

            socket.ws.onmessage({ data: '{"name":"test","data":["Some data."],"replyTo":"2"}'});
        });
    });
});

// ---------------------------------------------------------------------------------------------------------------------