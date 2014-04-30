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

Additionally, the WebSocket api is mildly obtuse, while the observer patter, or promise pattern is much nicer to work
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

Connecting to a server is straight forward, if you've ever used Socket.io:

```javascript
// You don't need to pass any arguments; it defaults to 'localhost:80'.
var socket = unisocket.connect();

// You can pass a normal url.
var socket = unisocket.connect("http://ws.example.com");

// You can omit the protocol.
var socket = unisocket.connect("ws.example.com");

// You can include port in any form of the url examples.
var socket = unisocket.connect("ws.example.com:1337");

// You can include a channel as well
var socket = unisocket.connect("ws.example.com:1337/news");
```

## Listening for messages

Once you've connected, you will want to listen for incoming messages, and respond to them. If you've ever used Socket.io
before, this should look familiar:

```javascript
socket.on('connected', function()
{
    socket.on('test', function(data)
    {
        console.log('got data:', data);
    });
});
```

A couple of points to mention, however. First, you must listen for the `connected` event _before attempting to send
messages_. If you do not, there is a chance the websocket hasn't finished connecting. Attempts to send will cause an
error (but not a fatal one).

_Note_: You do not need to wait for the `connected` event before registering your callbacks, _unlike_ the node.js
server.

Event callbacks will be passed any additional arguments the message was sent with. (If a reply is desired, the last
argument will always be a callback. See "Replies" for more information.)

### Sending messages

Sending messages is as simple as emitting an event in node. (We've intentionally use the same API as `EventEmitter`
since this is a common pattern for node.js developers.)

```javascript
client.emit('test', "Some additional data.");
```

You can pass as many arguments as you want, and they will be passed to the client's message handler callback.

### Complete (Basic) Example

```javascript
var socket = unisocket.connect("localhost:4000");
socket.on('connected', function()
{
    socket.emit('test', "Some data.");
});

socket.on('echo', function(msg)
{
    console.log('got:', msg);
});
```

## Features

In addition to the basic usage, UniSocket supports some very useful features.

### Using Channels

UniSocket supports namespacing messages. These namespaces are called 'channels'. (Socket.io has a very similar feature.)
If you want to use channels, both the client and server side will need to listen on the same channel. To setup message
handlers on a particular channel, you would do the following:

```javascript
var socket = unisocket.connect("/chat");
socket.on('echo', function(msg)
{
    console.log('got:', msg);
});
```

You call `unisocket.connect()` with any valid slug url for the channel name, and it will return you a `UniSocketClient`
object that is namespaced to that channel. All message handlers registered with `on()` will only fire for messages on
that channel.

You may also use a full url (ex: `http://ws.example.com:8080/news`) to connect; the host will be ignored if you've already connected to a websocket, otherwise
it will connect to that host first, then connect to the channel.

_Note_: The `connected` event _only_ fires when the websocket has connected. This means you will not get a `connected`
event for connecting to a channel, unless you have not connected to the underlying websocket.

### Using Replies

Frequently, it's useful to be able to reply to an incoming message (or get a reply back from the server). UniSocket
makes this as easy as possible, and unlike Socket.io, replies are bi-directional. The client can send a message, and the
server can reply, or the server can send a message, and the client reply. The API is intentionally identical on both
sides.

_Note_: Replies have a configurable timeout, however, that timeout cannot be infinite. If a reply is expected, the other
side should always respond.

#### Expecting a reply

If your message expects a reply, the final argument to `emit` must be a callback. This callback function will be called
when the reply comes in, with any arguments included in the reply.

```javascript
socket.emit('expects reply', "some data", function(replyData)
{
    console.log('responseData:', responseData);
});
```

#### Replying to a message

Replying to a message is also very straightforward. When a message comes in to the client that expects a reply, the
UniSocket client builds a callback for you, and appends that to the list of arguments your message handler function gets
passed. This means the last argument is _always_ the callback.

To reply, simply call the callback, with whatever data you wish to send back.

```javascript
socket.on('echo', function(msg, callback)
{
    // Echo msg back to the client.
    callback(msg);
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
socket.emit('edit');

// Here's a message with underscores
socket.emit('edit_blog');

// Here's a sentence fragment, with spaces
socket.emit('edit blog post');
```

Personally, I find the last example the most readable, and encourage people to use UniSocket like that.

_Note_: There is one small caveat: some server implementations (like Erlang) might require a bit of syntactic sugar to
support message names with spaces. However, the specification states that any valid unicode character is supported in a
message name, so all compliant servers must have a way of handling this. It's just useful to keep this in mind.

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

### A note on dependencies

The UniSocket client library is dependency free, and our intention is to keep it that way. We know (and love) many
Javascript frameworks, like underscore.js, lodash.js, jquery, etc, however, we want the client library to be easy to use
and self-contained. If a library becomes necessary, it will be bundled (in a `noConflict` manner) with the client code.