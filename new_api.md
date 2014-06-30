# New Client API

## Default Error Handler

You can setup a function to be your default error handler, for the promise style API. If you still call `error()` on a
promise, it will skip the default handler, and call your function.

```javascript
socket.defaultErrorHandler(function(error)
{
    console.error('Encountered an error:', error.stack || error.message || error.toString());
});
```

## Connection

We support connecting to the following style of urls:

* `""` - Empty string; means we connect to the current hostname/port; if we're http, we use `ws://`, if we're https, we use `wss://`.
* `"ws://localhost:8000"` - WS/WSS protocol; means we use the string directly.
* `"localhost:8000"` - No protocol; mean we use that hostname/port; if we're http, we use `ws://`, if we're https, we use `wss://`.
* `"http://localhost:8000"` - HTTP/HTTPS protocol; we replace that: if it's http, we use `ws://`, if it's https, we use `wss://`.

API:

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

//-----------------------------------------------------
// The socket object also supports events:
//-----------------------------------------------------

// Fired once we'ce successfully connected the first time. Only fired once per call to `connect()`.
socket.on('connected', function()
{
    console.log('Weee! Connected!');
});

// Fired the moment out connection is lost; use `closed` if you want to know when the connection is actually finished.
socket.on('disconnected', function()
{
    console.log('Boo! Disconnected.');
});

// Fired when we have successfully reconnected, before we've timed out.
socket.on('reconnected', function()
{
    console.log('Weee! Connected AGAIN!');
});

// Fired when either `close()` is called, or we timeout
socket.on('closed', function()
{
    console.log('Boo! The socket closed.');
});

// Fired when we timeout.
socket.on('timeout', function()
{
    console.log('Boo! We timed out reconnecting.');
});
```

### Handling reconnection

By default, it will always attempt to reconnect. The reconnection logic follows this algorithm based on how long we've 
been disconnected:

| Time disconnected | Action                                |
|:-----------------:|---------------------------------------|
|      <= 30s       | Attempts to immediately reconnect.    |
|      <= 2m        | Attempts to connect every 15 seconds. |
|      <= 5m        | Attempts to connect every 30 seconds. |
|      <= Infinity  | Attempts to connect every 60 seconds. |

It will _always_ attempt to reconnect, unless instructed to give up by the application. This can be done by calling the 
`close()` function. (If `.close()` is called and there's an open connection, we close the connection and do not attempt 
to reconnect.)

It also supports a timeout, by default infinity, but it can be set. If we timeout before reconnecting, then we fire a
`timeout` event, and automatically close the socket, as if `close()` had been called.

When we successfully reconnect, the `reconnected` event. (Note: We only fire the `connected` event once after 
`connect()` has been called; everything else is always a `reconnected` event. This behavior resets after calling 
`close()`.)

### Sending messages while reconnecting

We hold on to messages that are sent using `send()` or `request()` while we're still attempting to reconnect. If 
`close()` is called or the `timeout` event fires, we then purge any stored messages.

## Connecting to a channel

Connecting to a channel is an explicit call.

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

## Sending messages

We have two ways to send messages, `send()` and `request()`. The only difference is that `request()` expects a response.

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

## Receiving messages

Incoming messages may, or may not expect a reply. If they do, the last argument send will be a callback. You can either 
call it with your response, or you can simply return from the function.

We only support events for handling incoming messages.

```
javascript

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
        return 'reply message here (can be any JSON-able type)';
    } // end if
});
```