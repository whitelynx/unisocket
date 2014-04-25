# UniSocket

At it's heart, UniSocket is a simple wrapper around WebSockets. It's designed to handle the difficult part of using
websockets; the over-the-wire protocol. It then adds some extremely useful features, such as the ability to reply to a
message, or to namespace your connections. It consists of a lower-level event-based api, or a higher-level promise based
api.

Best of all, it's designed from the ground up to talk a straight-forward protocol, making it trivial to implement
clients or servers in any language. The UniSocket project even maintains several official servers:

* [unisocket-node](https://github.com/Morgul/unisocket-node) - A UniSocket based server for node.js, using `ws`.
* [unisocket-erl]() - A UniSocket based server for erlang, using `cowboy`. [Coming Soon!]
* [unisocket-python]() - A UniSocket based server for python 3.4+, using `asyncio`. [Coming Soon!]

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

## Examples

### Connecting

```javascript
// You don't need to pass any arguments; it defaults to 'localhost:80'.
var socket = unisocket.connect();

// You can pass a normal url.
var socket = unisocket.connect("http://ws.example.com");

// You can omit the protocol.
var socket = unisocket.connect("ws.example.com");

// You can include port in any form of the url examples.
var socket = unisocket.connect("ws.example.com:1337");
```

## Contributing

Feel free to make pull requests, fix bugs, add features, etc. We ask that all pull requests maintain the formatting and
style of the original file, and that all new features include tests. We reserve the right to refuse any features that
do not fit the project's goals. (Things like long-polling support, bindings to particular javascript frameworks, etc.)

### A note on dependencies

The UniSocket client library is dependency free, and our intention is to keep it that way. We know (and love) many
Javascript frameworks, like underscore.js, lodash.js, jquery, etc, however, we want the client library to be easy to use
and self-contained. If a library becomes necessary, it will be bundled (in a `noConflict` manner) with the client code.