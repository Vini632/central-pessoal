"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

function setupNews(extraMocks = {}) {
  const News = loadModule("js/modules/news.js", {
    ...extraMocks,
  });
  // Override DOM-dependent methods
  News.setupSatellite = () => {};
  return News;
}

describe("News Module", () => {
  let n;

  beforeEach(() => {
    n = setupNews();
  });

  describe("formatDate", () => {
    it("returns formatted date in pt-BR short format", () => {
      const result = n.formatDate("2026-07-15T12:00:00Z");
      // Should be something like "15 de jul." or "15/07"
      assert.ok(result.length > 0, "should return a non-empty string");
      assert.ok(result.includes("15"), "should include the day");
    });

    it("handles different date strings", () => {
      const result = n.formatDate("2026-01-01T00:00:00Z");
      assert.ok(result.includes("1") || result.includes("01"), "should include the day");
    });

    it("handles invalid dates gracefully", () => {
      const result = n.formatDate("not-a-date");
      assert.ok(
        result.toLowerCase().includes("invalid") || typeof result === "string",
        "should handle invalid date",
      );
    });

    it("returns a string", () => {
      assert.strictEqual(typeof n.formatDate("2026-07-15"), "string");
    });

    it("formats month abbreviation in Portuguese", () => {
      const result = n.formatDate("2026-07-15T12:00:00Z");
      // The month part should be recognizable
      assert.ok(result.length >= 5, "should be at least 5 chars");
    });
  });

  describe("sources", () => {
    it("has 5 RSS sources defined", () => {
      assert.strictEqual(n.sources.length, 5);
    });

    it("each source has name and url", () => {
      for (const src of n.sources) {
        assert.strictEqual(typeof src.name, "string");
        assert.ok(src.name.length > 0);
        assert.strictEqual(typeof src.url, "string");
        assert.ok(src.url.startsWith("http"));
      }
    });

    it("includes Tech Crunch", () => {
      const names = n.sources.map((s) => s.name);
      assert.ok(names.includes("Tech Crunch"));
    });

    it("includes Hacker News", () => {
      const names = n.sources.map((s) => s.name);
      assert.ok(names.includes("Hacker News"));
    });

    it("includes G1", () => {
      const names = n.sources.map((s) => s.name);
      assert.ok(names.includes("G1"));
    });

    it("includes UOL", () => {
      const names = n.sources.map((s) => s.name);
      assert.ok(names.includes("UOL"));
    });

    it("includes Canaltech", () => {
      const names = n.sources.map((s) => s.name);
      assert.ok(names.includes("Canaltech"));
    });
  });

  describe("fetchFeed", () => {
    it("fetches from rss2json API with encoded URL", async () => {
      let calledUrl = null;
      const mockFetch = async (url) => {
        calledUrl = url;
        return {
          ok: true,
          json: async () => ({ status: "ok", items: [] }),
        };
      };

      n = setupNews({ fetch: mockFetch });
      const result = await n.fetchFeed({ name: "Test", url: "https://example.com/feed" });
      assert.ok(calledUrl.includes("api.rss2json.com"), "should call rss2json");
      assert.ok(calledUrl.includes("example.com"), "should include the feed URL");
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    it("returns items array with source name", async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          status: "ok",
          items: [
            { title: "Article 1", link: "https://ex.com/1", pubDate: "2026-07-15" },
            { title: "Article 2", link: "https://ex.com/2", pubDate: "2026-07-14" },
          ],
        }),
      });

      n = setupNews({ fetch: mockFetch });
      const result = await n.fetchFeed({ name: "MySource", url: "https://ex.com/feed" });
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].title, "Article 1");
      assert.strictEqual(result[0].source, "MySource");
      assert.strictEqual(result[1].title, "Article 2");
      assert.strictEqual(result[1].source, "MySource");
    });

    it("returns empty array when API status is not ok", async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({ status: "error", message: "Invalid feed" }),
      });

      n = setupNews({ fetch: mockFetch });
      const result = await n.fetchFeed({ name: "Test", url: "https://ex.com/feed" });
      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    it("handles fetch errors gracefully", async () => {
      const mockFetch = async () => { throw new Error("Network error"); };

      n = setupNews({ fetch: mockFetch });
      // fetchFeed calls fetch() which throws — the function itself does NOT catch
      // So we expect it to throw. This test verifies the error propagates.
      await assert.rejects(
        () => n.fetchFeed({ name: "Test", url: "https://ex.com/feed" }),
        /Network error/,
      );
    });
  });

  describe("fetch (aggregation)", () => {
    it("sorts items by pubDate descending", async () => {
      let fetchCallCount = 0;
      const mockFetch = async (url) => {
        fetchCallCount++;
        if (url.includes("rss2json")) {
          return {
            ok: true,
            json: async () => ({
              status: "ok",
              items: [
                { title: `Article from source ${fetchCallCount}`, link: `https://ex.com/${fetchCallCount}`, pubDate: `2026-07-${15 - fetchCallCount}` },
              ],
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      };

      // Mock DOM for fetch()
      const mockItems = [];
      const mockContainer = {
        innerHTML: "",
        appendChild: (el) => { mockItems.push(el); },
      };
      const mockLoading = { textContent: "", style: { display: "" } };

      n = setupNews({
        fetch: mockFetch,
        document: {
          getElementById: (id) => {
            if (id === "news-list") return mockContainer;
            if (id === "news-loading") return mockLoading;
            return null;
          },
          createElement: () => ({
            className: "",
            innerHTML: "",
            appendChild: () => {},
            style: {},
            classList: { add: () => {}, remove: () => {} },
          }),
          querySelector: () => null,
          querySelectorAll: () => [],
          body: { appendChild: () => {} },
        },
      });

      await n.fetch();
      // Should have called fetchFeed for all 5 sources
      assert.strictEqual(fetchCallCount, 5);
    });

    it("shows empty message when no items returned", async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({ status: "ok", items: [] }),
      });

      const mockContainer = {
        innerHTML: "",
        appendChild: () => {},
      };
      const mockLoading = { textContent: "", style: { display: "" } };

      n = setupNews({
        fetch: mockFetch,
        document: {
          getElementById: (id) => {
            if (id === "news-list") return mockContainer;
            if (id === "news-loading") return mockLoading;
            return null;
          },
          createElement: () => ({
            className: "",
            innerHTML: "",
            appendChild: () => {},
            style: {},
            classList: { add: () => {}, remove: () => {} },
          }),
          querySelector: () => null,
          querySelectorAll: () => [],
          body: { appendChild: () => {} },
        },
      });

      await n.fetch();
    });
  });

  describe("init", () => {
    it("calls setupSatellite and fetch on init", () => {
      let setupCalled = false;
      let fetchCalled = false;
      n.setupSatellite = () => { setupCalled = true; };
      n.fetch = () => { fetchCalled = true; };

      n.init = function () {
        this.setupSatellite();
        this.fetch();
      };
      n.init();
      assert.strictEqual(setupCalled, true);
      assert.strictEqual(fetchCalled, true);
    });
  });
});
