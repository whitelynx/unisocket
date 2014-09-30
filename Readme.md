# UniSocket

[![Build Status](https://travis-ci.org/Morgul/unisocket.svg)](https://travis-ci.org/Morgul/unisocket)

At it's heart, UniSocket is a simple wrapper around WebSockets. It's designed to handle the difficult part of using
websockets; the over-the-wire protocol. It then adds some extremely useful features, such as the ability to reply to a
message, or to namespace your connections. It consists of a lower-level event-based api, or a higher-level promise based
api.

Best of all, it's designed from the ground up to talk a straight-forward protocol, making it trivial to implement
clients or servers in any language. The UniSocket project even maintains several official servers:

* [unisocket-node](https://github.com/Morgul/unisocket-node) - A UniSocket based server for node.js, using `ws`.
* [unisocket-erl]() - A UniSocket based server for erlang, using `cowboy`. (_Coming Soon!_)
* [unisocket-python]() - A UniSocket based server for python 3.4+, using `asyncio`. (_Coming Soon!_)

## Why not just use JSON and WebSockets directly?

Technically, there's no reason you can't. In fact, that's how UniSocket works under the hood. However, UniSocket handles
the boiler-plate code for using WebSockets, handles creating the JSON message for you, and gives you namespaces and
replies.

Additionally, the WebSocket api is mildly obtuse, while the observer pattern, or promise pattern is much nicer to work
with. If you want an additional carrot, then consider this: one of the first post-beta features we plan to add is binary
WebSocket support, with [MessagePack](http://msgpack.org/) instead of JSON messages. This should decrease message size,
and increase speed.

## Why not use Socket.io?

Socket.io is the main inspiration for UniSocket, and has been my go-to library for websockets for years. Unfortunately,
it ties a project to node. Not that we don't love node, but sometimes we have projects that would be a much better fit
in Erlang, or Python.

While some servers for other languages exist, they're very much second-class citizens. Socket.io's protocol is obtuse,
making it difficult to implement in other languages. Because of this, we've decided that a project with a clear, simple
protocol would be a much better fit to standardize on.

Also, since WebSockets have been implemented in the latest version of every mainstream browser, we feel that it's better
to be forward-looking and focus on a fast, lightweight library, than worry about fallback support.

## Getting Started

Every official server will server a compatible version of the client library for you to use. As such, we _strongly
recommend_ you use it. For most webprojects, this is as easy as:

```html
<script src="/unisocket/$/client.js"></script>
```

### Connecting

We support connecting to the following style of urls:

* `""` - Empty string; means we connect to the current hostname/port; if we're http, we use `ws://`, if we're https, we use `wss://`.
* `"ws://localhost:8000"` - WS/WSS protocol; means we use the string directly.
* `"localhost:8000"` - No protocol; mean we use that hostname/port; if we're http, we use `ws://`, if we're https, we use `wss://`.
* `"http://localhost:8000"` - HTTP/HTTPS protocol; we replace that: if it's http, we use `ws://`, if it's https, we use `wss://`.

```javascript
// Simple connection, connects to this host/port
var socket = unisocket.connect();

// Simple connection, connected callback
var socket = unisocket.connect(function(error)
{
    // handle error/do stuff
});

// Simple connection, promise based
var socket;
unisocket.connect().then(function(_socket)
{
    socket = _socket;
    // do stuff
}).error(function(error)
{
    // handle error
});
```

#### Events

UniSocket supports the following events on the main connection object:

* `connected` - Fired only once, the first time we connect to the server.
* `disconnected` - Fired when our websocket connection is lost; use `closed` if you want to know when we've stopped trying to reconnect and consider the connection dead.
* `reconnected` - Fired when we've successfully reestablished connection.
* `closed` - Fired once the socket is disconnected, and we are no longer attempting to reconnect. (This will either be because of a timeout, or because the user called `close()`.)
* `timeout` - Fired once we have disconnected, and reached our timeout before successfully reconnecting.

Here are some examples:

```javascript
socket.on('connected', function()
{
    console.log('Weee! Connected!');
});

socket.on('disconnected', function()
{
    console.log('Boo! Disconnected.');
});

socket.on('reconnected', function()
{
    console.log('Weee! Connected AGAIN!');
});

socket.on('closed', function()
{
    console.log('Boo! The socket closed.');
});

socket.on('timeout', function()
{
    console.log('Boo! We timed out reconnecting.');
});
```

#### Handling reconnection

By default, it will always attempt to reconnect. The reconnection logic follows this algorithm based on how long we've 
been disconnected:

| Time disconnected | Action                                |
|:-----------------:|---------------------------------------|
|      <= 30s       | Attempts to immediately reconnect.    |
|      <= 2m        | Attempts to connect every 15 seconds. |
|      <= 5m        | Attempts to connect every 30 seconds. |
|      <= Infinity  | Attempts to connect every 60 seconds. |

It will _always_ attempt to reconnect, unless instructed to give up by the application. This can be done by calling the 
`close()` function. (If `close()` is called and there's an open connection, we close the connection and do not attempt 
to reconnect.)

It also supports a timeout, by default infinity, but it can be set. If we timeout before reconnecting, then we fire a
`timeout` event, and automatically close the socket, as if `close()` had been called.

When we successfully reconnect, the `reconnected` event. (Note: We only fire the `connected` event once after 
`connect()` has been called; everything else is always a `reconnected` event. This behavior resets after calling 
`close()`.)

#### Sending messages while reconnecting

We hold on to messages that are sent using `send()` or `request()` while we're still attempting to reconnect. If 
`close()` is called or the `timeout` event fires, we then purge any stored messages.

### Connecting to a channel

UniSocket supports namespacing messages. These namespaces are called 'channels'. (Socket.io has a very similar feature.)
If you want to use channels, both the client and server side will need to listen on the same channel. To setup message
handlers on a particular channel, you would do the following:

```javascript
// Callback
socket.channel('foobar', function(channel)
{
    // Work with the channel here.
});

// Promise style
socket.channel('foobar').then(function(channel)
{
    // Work with the channel here.
});
```

### Listening for messages

Once you've connected, you will want to listen for incoming messages, and respond to them. If you've ever used Socket.io
before, this should look familiar:

```javascript
socket.on('test', function(data)
{
    console.log('got data:', data);
});
```

_Note: There is no Promise-based API for handling incoming messages. This is because we simply couldn't find any way of 
doing it that made sense, or leveraged Promises in a meaningful way. As a compromise, we allow you to reply to incoming 
messages in a Promise-style way._

#### Replies

Incoming messages may, or may not expect a reply. If they do, the last argument send will be a callback. You can either 
call it with your response, or you can simply return from the function.

```javascript

// Handle an incoming message, callback style
socket.on('message name', function(args, callback)
{
    console.log('handling the message.');
    
    if(callback)
    {
        callback(null, 'reply message here (can be any JSON-able type)');
    } // end if
});

// Handle an incoming message, promise style
socket.on('message name', function(args, expectsReply)
{
    console.log('handling the message.');
    
    if(expectsReply)
    {
        return 'reply message here (can be any JSON-able type, or a Promise of a JSON-able type)';
    } // end if
});
```

This allows you to use UniSocket as a sort of remote Promise API, if you so choose.

### Sending messages

We have two ways to send messages, `send()` and `request()`. The only difference between them is that `request()` 
expects a response.

```javascript
// Send a message
socket.send('message name', args1, args2, ...);

// Callback style
socket.request('message name', args1, args2, function(error, reply)
{
    console.log('reply:', reply);
});

// Promise style
socket.request('message name', args1, args2, ...).then(function(reply)
{
    console.log('reply:', reply);
});
```

You can pass as many arguments as you want, and they will be passed to the client's message handler callback.

### Complete (Basic) Example

```javascript
var socket = unisocket.connect("localhost:4000")
    .then(function()
    {
        socket.send('test', "Some data.");
    };
    
socket.on('echo', function(msg)
{
    console.log('got:', msg);
});
```

## Tips

While the UniSocket client is pretty simple to work with, there are some additional useful tips I felt might be
important to give examples of.

### Message names with spaces

UniSocket and UniSocket Server support message names with spaces in them. This means you can use phrases and sentence
fragments to describe the message; making it easier to understand what the message does. Here's an example:

```javascript
// Here's a single word message
socket.send('edit');

// Here's a message with underscores
socket.send('edit_blog');

// Here's a sentence fragment, with spaces
socket.send('edit blog post');
```

Personally, I find the last example the most readable, and encourage people to use UniSocket like that.

## Building

Since this is a browserify project, there _is_ a build step. Simply run the following command:

```bash
$ grunt build
```

That will output a `unisocket.min.js` file in the `dist` folder.

## Tests

Unit tests are run using `npm test`. This project requires karma (which itself requires node.js). To get setup for
development, simply do:

```bash
$ npm install
$ npm test
```

That should install all the dependencies, and run through all the unit tests.

## Contributing

Feel free to make pull requests, fix bugs, add features, etc. We ask that all pull requests maintain the formatting and
style of the original file, and that all new features include tests. We reserve the right to refuse any features that
do not fit the project's goals. (Things like long-polling support, bindings to particular javascript frameworks, etc.)

### License

All code is licensed under the MIT license.
