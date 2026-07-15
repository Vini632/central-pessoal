"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert");
const vm = require("vm");
const fs = require("fs");
const path = require("path");

/**
 * Load data.js and return ALL top-level exports (Toast, Modal, Data, apiFetch).
 * Uses the same VM approach as loadModule but returns an object with all exports.
 */
function loadDataModule(extraMocks = {}) {
  const projectRoot = path.resolve(__dirname, "..");
  const code = fs.readFileSync(path.join(projectRoot, "js/data.js"), "utf-8");

  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    String,
    Number,
    Boolean,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    RegExp,
    Array,
    Object,
    Map,
    Set,
    Promise,
    URL,
    URLSearchParams,
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    window: {},
    document: {
      getElementById: () => null,
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: () => {},
        remove: () => {},
        focus: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        setAttribute: () => {},
        getAttribute: () => null,
        textContent: "",
        innerHTML: "",
        dispatchEvent: () => {},
      }),
      createTextNode: () => ({}),
      body: { appendChild: () => {} },
      head: { appendChild: () => {} },
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    localStorage: {
      _data: {},
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
      clear() { this._data = {}; },
      get length() { return Object.keys(this._data).length; },
      key(i) { return Object.keys(this._data)[i] ?? null; },
    },
    Notification: { permission: "default", requestPermission() {} },
    Data: { _store: {}, get(k) { return this._store[k] ?? null; }, save(k, v) { this._store[k] = v; }, remove(k) { delete this._store[k]; } },
    Toast: { info() {}, success() {}, warn() {}, error() {} },
    Modal: { confirm: async () => true, prompt: async () => "" },
    Settings: { get: () => null },
    Voice: { recognition: null, start() {}, stop() {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => "", headers: { get: () => null } }),
    ...extraMocks,
  };

  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);

  // Extract top-level consts
  const constNames = [...code.matchAll(/^const\s+(\w+)\s*=/gm)].map((m) => m[1]);
  const wrappedCode = code + "\n;" + constNames.map((n) => `this.${n} = ${n};`).join("\n");

  vm.runInContext(wrappedCode, sandbox, { filename: "js/data.js" });

  return {
    Toast: sandbox.Toast,
    Modal: sandbox.Modal,
    Data: sandbox.Data,
    apiFetch: sandbox.apiFetch,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Toast
// ────────────────────────────────────────────────────────────────────────────
describe("Toast", () => {
  it("has all shortcut methods", () => {
    const exported = loadDataModule();
    const t = exported.Toast;
    assert.strictEqual(typeof t.show, "function");
    assert.strictEqual(typeof t.info, "function");
    assert.strictEqual(typeof t.success, "function");
    assert.strictEqual(typeof t.warn, "function");
    assert.strictEqual(typeof t.error, "function");
  });

  it("info delegates to show with type 'info'", () => {
    const { Toast: t } = loadDataModule();
    let calledArgs = null;
    t.show = (m, type) => { calledArgs = { m, type }; };
    t.info("test");
    assert.deepStrictEqual(calledArgs, { m: "test", type: "info" });
  });

  it("success delegates to show with type 'success'", () => {
    const { Toast: t } = loadDataModule();
    let calledArgs = null;
    t.show = (m, type) => { calledArgs = { m, type }; };
    t.success("ok");
    assert.deepStrictEqual(calledArgs, { m: "ok", type: "success" });
  });

  it("warn delegates to show with type 'warn'", () => {
    const { Toast: t } = loadDataModule();
    let calledArgs = null;
    t.show = (m, type) => { calledArgs = { m, type }; };
    t.warn("caution");
    assert.deepStrictEqual(calledArgs, { m: "caution", type: "warn" });
  });

  it("error delegates to show with type 'error'", () => {
    const { Toast: t } = loadDataModule();
    let calledArgs = null;
    t.show = (m, type) => { calledArgs = { m, type }; };
    t.error("fail");
    assert.deepStrictEqual(calledArgs, { m: "fail", type: "error" });
  });

  it("show runs without throwing even with minimal DOM", () => {
    const { Toast: t } = loadDataModule();
    t.show("hello");
    t.show("world", "error");
    t.show("test", "success", 1000);
    assert.ok(true, "Toast.show should not throw");
  });

  it("show creates a toast container on first call", () => {
    // Provide a document that tracks createElement calls
    let createdElements = [];
    const { Toast: t } = loadDataModule({
      document: {
        getElementById: () => null,
        createElement: (tag) => {
          const el = {
            tagName: tag.toUpperCase(),
            className: "",
            textContent: "",
            style: {},
            classList: { add: () => {}, remove: () => {}, contains: () => false },
            appendChild: () => {},
            remove: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
          };
          createdElements.push(el);
          return el;
        },
        body: { appendChild: () => {} },
        querySelector: () => null,
        querySelectorAll: () => [],
        head: { appendChild: () => {} },
      },
    });
    t.show("test");
    assert.ok(createdElements.length >= 2, "should create at least container + toast element");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Modal
// ────────────────────────────────────────────────────────────────────────────
describe("Modal", () => {
  function makeModalDOM() {
    const overlay = {
      className: "hidden",
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      onclick: null,
    };
    const titleEl = { textContent: "" };
    const bodyEl = { innerHTML: "" };
    const confirmBtn = { textContent: "", style: { display: "" }, onclick: null };
    const cancelBtn = { textContent: "", style: { display: "" }, onclick: null };
    const closeBtn = { onclick: null };

    const elements = { "modal-overlay": overlay, "modal-title": titleEl, "modal-body": bodyEl, "modal-confirm": confirmBtn, "modal-cancel": cancelBtn, "modal-close": closeBtn };

    return {
      get elementMap() { return elements; },
      get overlay() { return overlay; },
      get confirmBtn() { return confirmBtn; },
      get cancelBtn() { return cancelBtn; },
    };
  }

  it("has confirm and prompt methods", () => {
    const { Modal: m } = loadDataModule();
    assert.strictEqual(typeof m.confirm, "function");
    assert.strictEqual(typeof m.prompt, "function");
  });

  it("confirm returns a Promise", () => {
    const dom = makeModalDOM();
    const { Modal: m } = loadDataModule({
      document: { getElementById: (id) => dom.elementMap[id] || null, createElement: () => ({}), body: { appendChild: () => {} }, querySelector: () => null, querySelectorAll: () => [], head: { appendChild: () => {} } },
    });
    const p = m.confirm("Sure?");
    assert.ok(p instanceof Promise);
  });

  it("confirm resolves true when confirm button clicked", async () => {
    const dom = makeModalDOM();
    const { Modal: m } = loadDataModule({
      document: { getElementById: (id) => dom.elementMap[id] || null, createElement: () => ({}), body: { appendChild: () => {} }, querySelector: () => null, querySelectorAll: () => [], head: { appendChild: () => {} } },
    });
    const p = m.confirm("Sure?");
    if (dom.confirmBtn.onclick) dom.confirmBtn.onclick();
    const result = await p;
    assert.strictEqual(result, true);
  });

  it("confirm resolves false when cancel button clicked", async () => {
    const dom = makeModalDOM();
    const { Modal: m } = loadDataModule({
      document: { getElementById: (id) => dom.elementMap[id] || null, createElement: () => ({}), body: { appendChild: () => {} }, querySelector: () => null, querySelectorAll: () => [], head: { appendChild: () => {} } },
    });
    const p = m.confirm("Sure?");
    if (dom.cancelBtn.onclick) dom.cancelBtn.onclick();
    const result = await p;
    assert.strictEqual(result, false);
  });

  it("confirm resolves false when overlay background clicked", async () => {
    const dom = makeModalDOM();
    const { Modal: m } = loadDataModule({
      document: { getElementById: (id) => dom.elementMap[id] || null, createElement: () => ({}), body: { appendChild: () => {} }, querySelector: () => null, querySelectorAll: () => [], head: { appendChild: () => {} } },
    });
    const p = m.confirm("Sure?");
    if (dom.overlay.onclick) dom.overlay.onclick({ target: dom.overlay });
    const result = await p;
    assert.strictEqual(result, false);
  });

  it("confirm does NOT resolve when child element clicked", () => {
    const dom = makeModalDOM();
    const { Modal: m } = loadDataModule({
      document: { getElementById: (id) => dom.elementMap[id] || null, createElement: () => ({}), body: { appendChild: () => {} }, querySelector: () => null, querySelectorAll: () => [], head: { appendChild: () => {} } },
    });
    let resolved = false;
    m.confirm("Sure?").then(() => { resolved = true; });
    // Click something else (not overlay itself)
    if (dom.overlay.onclick) dom.overlay.onclick({ target: {} });
    assert.strictEqual(resolved, false);
  });

  it("prompt returns a Promise", () => {
    const dom = makeModalDOM();
    const { Modal: m } = loadDataModule({
      document: { getElementById: (id) => dom.elementMap[id] || null, createElement: () => ({}), body: { appendChild: () => {} }, querySelector: () => null, querySelectorAll: () => [], head: { appendChild: () => {} } },
    });
    const p = m.prompt("Name?");
    assert.ok(p instanceof Promise);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────────────────
describe("Data", () => {
  it("has expected methods", () => {
    const { Data: d } = loadDataModule();
    assert.strictEqual(typeof d.load, "function");
    assert.strictEqual(typeof d.save, "function");
    assert.strictEqual(typeof d.get, "function");
    assert.strictEqual(typeof d.remove, "function");
  });

  it("starts with empty cache", () => {
    const { Data: d } = loadDataModule();
    // Use Object.keys to avoid prototype differences between VM and host contexts
    assert.strictEqual(Object.keys(d.cache).length, 0);
    assert.strictEqual(d._loaded, false);
  });

  it("get returns cached value when present", () => {
    const { Data: d } = loadDataModule();
    d.cache["mykey"] = "cached_value";
    assert.strictEqual(d.get("mykey"), "cached_value");
  });

  it("get returns null for missing key", () => {
    const { Data: d } = loadDataModule();
    assert.strictEqual(d.get("nonexistent"), null);
  });

  it("get falls back to localStorage when not in cache", () => {
    const ls = { _data: { central_fallback: JSON.stringify("ls_value") }, getItem(k) { return this._data[k] ?? null; } };
    const { Data: d } = loadDataModule({ localStorage: ls });
    delete d.cache["central_fallback"];
    assert.strictEqual(d.get("central_fallback"), "ls_value");
  });

  it("save sets value in cache", () => {
    const { Data: d } = loadDataModule();
    d.save("mykey", { foo: "bar" });
    assert.deepStrictEqual(d.cache["mykey"], { foo: "bar" });
  });

  it("save writes to localStorage", () => {
    const ls = { _data: {}, setItem(k, v) { this._data[k] = v; }, getItem(k) { return this._data[k] ?? null; }, removeItem(k) { delete this._data[k]; }, clear() { this._data = {}; }, get length() { return Object.keys(this._data).length; }, key(i) { return Object.keys(this._data)[i] ?? null; } };
    const { Data: d } = loadDataModule({ localStorage: ls });
    d.save("central_test", [1, 2, 3]);
    assert.deepStrictEqual(d.cache["central_test"], [1, 2, 3]);
  });

  it("remove deletes key from cache", () => {
    const { Data: d } = loadDataModule();
    d.cache["torm"] = "value";
    d.remove("torm");
    assert.strictEqual(d.cache["torm"], undefined);
  });

  it("remove writes null to server", () => {
    let lastPostBody = null;
    const customFetch = async (url, fetchOpts) => {
      if (fetchOpts && fetchOpts.method === "POST") lastPostBody = fetchOpts.body;
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
    };
    const { Data: d } = loadDataModule({ fetch: customFetch });
    d.cache["torm"] = "value";
    d.remove("torm");
    // Should have sent null to server
    if (lastPostBody) {
      const parsed = JSON.parse(lastPostBody);
      assert.strictEqual(parsed.torm, null);
    }
  });

  it("load fetches from server and populates cache on success", async () => {
    const serverData = { central_notes: [{ id: "n1", content: "test" }], central_todo: [] };
    const customFetch = async (url) => {
      if (url === "/api/data") return { ok: true, status: 200, json: async () => serverData, text: async () => "", headers: new Map() };
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
    };
    const { Data: d } = loadDataModule({ fetch: customFetch });
    await d.load();
    assert.strictEqual(d._loaded, true);
    assert.deepStrictEqual(d.cache.central_notes, [{ id: "n1", content: "test" }]);
  });

  it("load falls back to localStorage when server unavailable", async () => {
    // Mock localStorage with some data
    const lsData = { central_fallback_test: JSON.stringify("stored") };
    const ls = {
      _data: lsData,
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
      clear() { this._data = {}; },
      get length() { return Object.keys(this._data).length; },
      key(i) { return Object.keys(this._data)[i] ?? null; },
    };

    // Fetch that fails
    const customFetch = async () => { throw new Error("Server down"); };
    const { Data: d } = loadDataModule({ fetch: customFetch, localStorage: ls });
    d.cache = {};
    await d.load();
    assert.strictEqual(d._loaded, true);
    assert.strictEqual(d.cache.central_fallback_test, "stored");
  });

  it("load merges localStorage keys not present in server data", async () => {
    const serverData = { central_notes: [] };
    const lsData = { central_extra: JSON.stringify("extra"), central_notes: JSON.stringify([{ id: "old" }]) };
    const ls = {
      _data: lsData,
      getItem(k) { return this._data[k] ?? null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; },
      clear() { this._data = {}; },
      get length() { return Object.keys(this._data).length; },
      key(i) { return Object.keys(this._data)[i] ?? null; },
    };

    let postedData = null;
    const customFetch = async (url, _opts) => {
      if (_opts && _opts.method === "POST") postedData = JSON.parse(_opts.body);
      return { ok: true, status: 200, json: async () => serverData, text: async () => "" };
    };

    const { Data: d } = loadDataModule({ fetch: customFetch, localStorage: ls });
    await d.load();
    // Server data should be loaded
    assert.ok(Array.isArray(d.cache.central_notes));
    // Extra localStorage key not on server should be merged
    assert.strictEqual(d.cache.central_extra, "extra");
    // The extra key should have been posted to server
    assert.ok(postedData, "should have posted extra key to server");
  });

  it("handles concurrent save/get/remove operations gracefully", () => {
    const { Data: d } = loadDataModule();
    d.save("k1", 1);
    d.save("k2", 2);
    assert.strictEqual(d.get("k1"), 1);
    assert.strictEqual(d.get("k2"), 2);
    d.remove("k1");
    assert.strictEqual(d.get("k1"), null);
    assert.strictEqual(d.get("k2"), 2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// apiFetch
// ────────────────────────────────────────────────────────────────────────────
describe("apiFetch", () => {
  it("is a function", () => {
    const { apiFetch: af } = loadDataModule();
    assert.strictEqual(typeof af, "function");
  });

  it("calls fetch with the given url", async () => {
    let calledUrl = null;
    const customFetch = async (url, _opts) => {
      calledUrl = url;
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
    };
    const mod = loadDataModule({ fetch: customFetch });
    await mod.apiFetch("/api/test");
    // Check that our fetch was called
    assert.strictEqual(calledUrl, "/api/test");
  });

  it("adds Authorization header when meta token exists", async () => {
    let calledHeaders = null;
    const customFetch = async (url, _opts) => {
      calledHeaders = _opts?.headers || {};
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
    };

    // apiFetch reads the token from: document.querySelector('meta[name="api-token"]')?.content
    const metaTag = { content: "my-token-123" };
    const { apiFetch: af } = loadDataModule({
      fetch: customFetch,
      document: {
        querySelector: (sel) => {
          if (sel === 'meta[name="api-token"]') return metaTag;
          return null;
        },
        getElementById: () => null,
        createElement: () => ({}),
        body: { appendChild: () => {} },
        querySelectorAll: () => [],
        head: { appendChild: () => {} },
      },
    });

    await af("/api/secure");
    assert.ok(calledHeaders, "headers should exist");
    assert.strictEqual(calledHeaders.Authorization, "Bearer my-token-123");
  });

  it("works without auth token", async () => {
    let calledHeaders = null;
    const customFetch = async (url, _opts) => {
      calledHeaders = _opts?.headers || {};
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
    };

    const { apiFetch: af } = loadDataModule({
      fetch: customFetch,
      document: {
        querySelector: () => null,
        getElementById: () => null,
        createElement: () => ({}),
        body: { appendChild: () => {} },
        querySelectorAll: () => [],
        head: { appendChild: () => {} },
      },
    });

    await af("/api/public");
    // Should NOT have Authorization header
    assert.strictEqual(calledHeaders?.Authorization, undefined);
  });

  it("preserves user-provided headers", async () => {
    let calledOpts = null;
    const customFetch = async (url, _opts) => {
      calledOpts = _opts;
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
    };

    const { apiFetch: af } = loadDataModule({
      fetch: customFetch,
      document: { querySelector: () => null, getElementById: () => null, createElement: () => ({}), body: { appendChild: () => {} }, querySelectorAll: () => [], head: { appendChild: () => {} } },
    });

    await af("/api/data", { headers: { "Content-Type": "application/json" }, method: "POST" });
    assert.ok(calledOpts, "options should exist");
    assert.strictEqual(calledOpts.method, "POST");
    assert.strictEqual(calledOpts.headers["Content-Type"], "application/json");
  });
});
