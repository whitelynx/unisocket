// ---------------------------------------------------------------------------------------------------------------------
// Takes a url and converts it to a `ws://` or `wss://` url for websocket connection.
//
// We support connecting to the following style of urls:
//  * `""` - Empty string. We connect to the current hostname/port; if we're http, we use `ws://`, if we're https, we use `wss://`.
//  * `"ws://localhost:8000"` - WS/WSS protocol. We use the string directly.
//  * `"localhost:8000"` - No protocol. We use that hostname/port; if we're http, we use `ws://`, if we're https, we use `wss://`.
//  * `"http://localhost:8000"` - HTTP/HTTPS protocol. We replace that: if it's http, we use `ws://`, if it's https, we use `wss://`.
//
// @module urlparser.js
// ---------------------------------------------------------------------------------------------------------------------

var forceSecure = false;

// ---------------------------------------------------------------------------------------------------------------------

function isSecure()
{
    if(typeof window !== 'undefined')
    {
        // Get this from the browser
        return forceSecure || (window.location.protocol == 'https:');
    }
    else
    {
        // We have no way to know, so we're only secure if we've been told to force secure connections.
        return forceSecure;
    } // end if
} // end isSecure

function getLocation()
{
    if(typeof window !== 'undefined')
    {
        // Get this from the browser
        return { host: window.location.hostname, port: window.location.port };
    }
    else
    {
        // We're in node, so guess at the port
        return { host: 'localhost', port: isSecure() ? 443 : 80 };
    } // end if
} // end getLocation()

// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
    normalize: function(url)
    {
        url = url || "";

        if(url.substring(0, 2) == 'ws')
        {
            // This means we have a `ws://` or `wss://` style url; we're set.
            return url;
        }
        else if(url.substring(0, 7) == 'http://')
        {
            url = url.replace('http://', (forceSecure ? 'wss://': 'ws://'));
        }
        else if(url.substring(0, 8) == 'https://')
        {
            url = url.replace('https://', 'wss://');
        }
        else if(url.length > 0)
        {
            // Guess `ws://` or `wss://`
            url = (isSecure() ? 'wss://': 'ws://') + url;
        }
        else
        {
            var location = getLocation();
            url = (isSecure() ? 'wss://' : 'ws://') + location.host + ':' + location.port;
        } // end if

        return url;
    }, // end normalize
    forceSecure: function()
    {
        forceSecure = true;
    } // end forceSecure
}; // end exports

// ---------------------------------------------------------------------------------------------------------------------
