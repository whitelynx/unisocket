// ---------------------------------------------------------------------------------------------------------------------
// Unit Tests for the urlparser.spec.js module.
//
// @module urlparser.spec.js
// ---------------------------------------------------------------------------------------------------------------------

var assert = require("assert");

var urlParser = require('../lib/urlparser');

// ---------------------------------------------------------------------------------------------------------------------

describe('UrlParser', function()
{
    it('normalizes blank urls', function()
    {
        var url = urlParser.normalize();
        assert.equal(url, 'ws://localhost:80');
    });

    it('normalizes hostname only urls', function()
    {
        var url = urlParser.normalize('localhost');
        assert.equal(url, 'ws://localhost');

        url = urlParser.normalize('localhost:4000');
        assert.equal(url, 'ws://localhost:4000');
    });

    it('normalizes http urls', function()
    {
        var url = urlParser.normalize('http://localhost');
        assert.equal(url, 'ws://localhost');

        url = urlParser.normalize('http://localhost:4000');
        assert.equal(url, 'ws://localhost:4000');
    });

    it('normalizes https urls', function()
    {
        var url = urlParser.normalize('https://localhost');
        assert.equal(url, 'wss://localhost');

        url = urlParser.normalize('https://localhost:4000');
        assert.equal(url, 'wss://localhost:4000');
    });

    it('normalizes ws urls', function()
    {
        var url = urlParser.normalize('ws://localhost');
        assert.equal(url, 'ws://localhost');

        url = urlParser.normalize('ws://localhost:4000');
        assert.equal(url, 'ws://localhost:4000');
    });

    it('normalizes wss urls', function()
    {
        var url = urlParser.normalize('wss://localhost');
        assert.equal(url, 'wss://localhost');

        url = urlParser.normalize('wss://localhost:4000');
        assert.equal(url, 'wss://localhost:4000');
    });

    it('wss urls can be forced', function()
    {
        urlParser.forceSecure();

        var url = urlParser.normalize();
        assert.equal(url, 'wss://localhost:443');

        url = urlParser.normalize('localhost');
        assert.equal(url, 'wss://localhost');

        url = urlParser.normalize('http://localhost');
        assert.equal(url, 'wss://localhost');
    });
});

// ---------------------------------------------------------------------------------------------------------------------