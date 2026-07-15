"use strict";
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");

/**
 * Test the WebSocket terminal module (server/ws/terminal.js).
 * This module is a CommonJS server module, so we use require() directly.
 * It exports { setup } which takes an HTTP server and creates a WebSocketServer.
 */
describe("WebSocket Terminal (server/ws/terminal.js)", () => {
  let mod;
  let server;

  before(() => {
    delete require.cache[require.resolve("../server/middleware")];
    delete require.cache[require.resolve("../server/ws/terminal")];
    process.env.API_TOKEN = "";
    mod = require("../server/ws/terminal");
  });

  after(() => {
    if (server) {
      server.close();
      server = null;
    }
  });

  it("exports a setup function", () => {
    assert.strictEqual(typeof mod.setup, "function");
  });

  it("setup accepts an HTTP server without throwing", () => {
    server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end("ok");
    });
    assert.doesNotThrow(() => {
      mod.setup(server);
    });
  });

  it("server responds to HTTP requests on other paths", (done) => {
    if (!server) {
      server = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("hello");
      });
    }
    server.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}/test`, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          assert.strictEqual(res.statusCode, 200);
          assert.strictEqual(data, "hello");
          done();
        });
      });
    });
  });
});

describe("WebSocket Terminal - verifyClient", () => {
  let mod;

  before(() => {
    delete require.cache[require.resolve("../server/middleware")];
    delete require.cache[require.resolve("../server/ws/terminal")];
    process.env.API_TOKEN = "test-ws-token";
    mod = require("../server/ws/terminal");
  });

  after(() => {
    delete process.env.API_TOKEN;
  });

  it("setup function exists with API_TOKEN set", () => {
    assert.strictEqual(typeof mod.setup, "function");
  });
});

describe("WebSocket Terminal - no API_TOKEN", () => {
  before(() => {
    delete process.env.API_TOKEN;
    delete require.cache[require.resolve("../server/middleware")];
    delete require.cache[require.resolve("../server/ws/terminal")];
  });

  it("loads without API_TOKEN", () => {
    const m = require("../server/ws/terminal");
    assert.strictEqual(typeof m.setup, "function");
  });
});
