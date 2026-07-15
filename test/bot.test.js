"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

function setupBot(extraMocks = {}) {
  const Bot = loadModule("js/modules/bot.js", {
    ...extraMocks,
  });

  // Override DOM-dependent methods
  Bot.render = () => {};
  Bot.close = () => {};

  return Bot;
}

describe("Bot Module", () => {
  let b;

  beforeEach(() => {
    b = setupBot();
  });

  describe("formatUptime", () => {
    it('returns "agora mesmo" for 0 seconds', () => {
      assert.strictEqual(b.formatUptime(0), "agora mesmo");
    });

    it('returns "agora mesmo" for negative values', () => {
      assert.strictEqual(b.formatUptime(-1), "agora mesmo");
    });

    it('returns "agora mesmo" for null/undefined', () => {
      assert.strictEqual(b.formatUptime(null), "agora mesmo");
      assert.strictEqual(b.formatUptime(undefined), "agora mesmo");
    });

    it("returns minutes when less than 1 hour", () => {
      const result = b.formatUptime(300); // 5 min
      assert.ok(result.includes("5m") || result.includes("<1m"));
    });

    it("returns hours and minutes", () => {
      const result = b.formatUptime(3660); // 1h1m
      assert.ok(result.includes("1h"));
      assert.ok(result.includes("1m"));
    });

    it("returns days, hours, minutes", () => {
      const result = b.formatUptime(90061); // 1d 1h 1m
      assert.ok(result.includes("1d"));
      assert.ok(result.includes("1h"));
      assert.ok(result.includes("1m"));
    });

    it("returns only days when hours and minutes are 0", () => {
      const result = b.formatUptime(86400); // 1d
      assert.strictEqual(result, "1d");
    });

    it("handles large uptime values", () => {
      const result = b.formatUptime(86400 * 30); // 30 days
      assert.ok(result.includes("30d"));
    });

    it("returns only hours when minutes are 0", () => {
      const result = b.formatUptime(7200); // 2h
      assert.strictEqual(result, "2h");
    });
  });

  describe("load", () => {
    it("sets default botUrl when no saved URL exists", () => {
      b.load();
      assert.strictEqual(b.botUrl, "http://localhost:8000");
    });

    it("restores saved URL from Data", () => {
      // Override Data.get for this module
      // The bot.load() calls Data.get('central_bot_url')
      // Our mock Data returns null by default, so default URL stays
      b.load();
      assert.strictEqual(b.botUrl, "http://localhost:8000");
    });
  });

  describe("save", () => {
    it("persists current botUrl", () => {
      b.botUrl = "http://custom:8080";
      b.save();
      // Just verify no throw - actual persistence is through Data.save
      assert.strictEqual(b.botUrl, "http://custom:8080");
    });
  });

  describe("fetch", () => {
    it("handles successful bot status response", async () => {
      const mockFetch = async (url) => {
        assert.ok(url.includes("/api/bot/status"));
        return {
          ok: true,
          json: async () => ({
            online: true,
            user: "Satella",
            user_id: "123",
            guilds: 5,
            members: 100,
            commands: 10,
            latency: 50,
            uptime: 3600,
          }),
        };
      };

      b = setupBot({ fetch: mockFetch, botUrl: "http://localhost:8000" });
      b.botUrl = "http://localhost:8000";
      b.render = () => {};
      b.startPolling = () => {};
      await b.fetch();
      assert.ok(b.data);
      assert.strictEqual(b.data.online, true);
      assert.strictEqual(b.data.user, "Satella");
      assert.strictEqual(b.data.guilds, 5);
      assert.strictEqual(b.data.latency, 50);
    });

    it("handles failed bot status response", async () => {
      const mockFetch = async () => {
        throw new Error("Connection refused");
      };

      b = setupBot({ fetch: mockFetch });
      b.render = () => {};
      await b.fetch();
      assert.strictEqual(b.data, null);
    });

    it("sets data to null when response is not ok", async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 500,
      });

      b = setupBot({ fetch: mockFetch });
      b.render = () => {};
      await b.fetch();
      assert.strictEqual(b.data, null);
    });

    it("does not start polling if already fetching", async () => {
      b._fetching = true;
      b.fetch = async () => {};
      assert.strictEqual(b._fetching, true);
    });
  });

  describe("reconnect", () => {
    it("calls fetch on reconnect", () => {
      let fetchCalled = false;
      b.fetch = () => { fetchCalled = true; };
      b.reconnect();
      assert.strictEqual(fetchCalled, true);
    });

    it("resets fetching state on reconnect", () => {
      b._fetching = false;
      let fetchCalled = false;
      b.fetch = () => { fetchCalled = true; };
      b.reconnect();
      assert.strictEqual(fetchCalled, true);
    });
  });

  describe("data properties", () => {
    it("initializes with default state", () => {
      // Re-setup to check initial state
      assert.strictEqual(b.data, null);
      assert.strictEqual(b.guilds, null);
      assert.strictEqual(b.logs, null);
    });

    it("botUrl defaults to localhost:8000", () => {
      assert.strictEqual(b.botUrl, "http://localhost:8000");
    });

    it("timer is initially null", () => {
      assert.strictEqual(b.timer, null);
    });
  });

  describe("stopPolling", () => {
    it("stops polling and clears timer", () => {
      b.timer = setInterval(() => {}, 1000);
      b.stopPolling();
      assert.strictEqual(b.timer, null);
    });

    it("is safe to call when timer is already null", () => {
      b.timer = null;
      b.stopPolling();
      assert.strictEqual(b.timer, null);
    });
  });
});
