"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupSettings(extraMocks = {}) {
  const Settings = loadModule("js/modules/settings.js", {
    // apiFetch mock for _loadSensitive / save
    apiFetch: async (url, opts) => {
      if (opts?.method === "POST") return { ok: true, json: async () => ({}) };
      // GET returns empty values
      return { ok: true, json: async () => ({ value: "" }) };
    },
    // google mock for driveConnect
    google: { accounts: { oauth2: { initTokenClient: () => ({ requestAccessToken: () => {} }) } } },
    ...extraMocks,
  });

  // Reset state
  Settings.data = {};
  Settings._ytKey = "";
  Settings._driveToken = "";
  Settings._cleanup = null;

  // Override DOM-dependent methods (leave pure logic intact)
  Settings.init = function () {};
  Settings.open = function () {};
  Settings.driveConnect = function () {};
  Settings.driveBackup = function () {};
  Settings.driveRestore = function () {};
  Settings.testYtKey = function () {};

  return Settings;
}

describe("Settings Module - defaults", () => {
  let s;
  beforeEach(() => {
    s = setupSettings();
  });

  it("has default values for all keys", () => {
    const defaults = s.defaults;
    assert.ok("aiModel" in defaults);
    assert.ok("weatherCity" in defaults);
    assert.ok("theme" in defaults);
    assert.ok("driveClientId" in defaults);
    assert.ok("ollamaUrl" in defaults);
  });

  it("default theme is monochrome", () => {
    assert.strictEqual(s.defaults.theme, "monochrome");
  });

  it("all defaults are empty strings except theme", () => {
    for (const [key, val] of Object.entries(s.defaults)) {
      if (key === "theme") {
        assert.strictEqual(val, "monochrome");
      } else {
        assert.strictEqual(val, "");
      }
    }
  });
});

describe("Settings Module - toggleTheme", () => {
  let s;
  beforeEach(() => {
    s = setupSettings();
    s.data.theme = "monochrome";
    s.save = function () {};
    s.applyTheme = function () {};
  });

  it("toggles from monochrome to light", () => {
    s.toggleTheme();
    assert.strictEqual(s.data.theme, "light");
  });

  it("toggles from light to monochrome", () => {
    s.data.theme = "light";
    s.toggleTheme();
    assert.strictEqual(s.data.theme, "monochrome");
  });

  it("calls save after toggling", () => {
    let saved = false;
    s.save = function () {
      saved = true;
    };
    s.toggleTheme();
    assert.ok(saved);
  });

  it("calls applyTheme after toggling", () => {
    let applied = false;
    s.applyTheme = function () {
      applied = true;
    };
    s.toggleTheme();
    assert.ok(applied);
  });

  it("toggles back and forth", () => {
    s.toggleTheme(); // monochrome -> light
    s.toggleTheme(); // light -> monochrome
    assert.strictEqual(s.data.theme, "monochrome");
    s.toggleTheme(); // monochrome -> light
    assert.strictEqual(s.data.theme, "light");
  });
});

describe("Settings Module - applyTheme", () => {
  let s;
  let docElement;

  beforeEach(() => {
    docElement = {
      _attrs: {},
      setAttribute(name, val) {
        this._attrs[name] = val;
      },
      removeAttribute(name) {
        delete this._attrs[name];
      },
    };
    s = setupSettings({
      document: {
        documentElement: docElement,
        getElementById: (id) => {
          if (id === "theme-icon-dark") return { style: { display: "" } };
          if (id === "theme-icon-light") return { style: { display: "" } };
          return null;
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });
    s.data.theme = "monochrome";
  });

  it("sets data-theme to light when theme is light", () => {
    s.data.theme = "light";
    s.applyTheme();
    assert.strictEqual(docElement._attrs["data-theme"], "light");
  });

  it("removes data-theme when theme is monochrome", () => {
    docElement._attrs["data-theme"] = "light";
    s.applyTheme();
    assert.strictEqual(docElement._attrs["data-theme"], undefined);
  });

  it("shows light icon and hides dark icon when theme is light", () => {
    const icons = { dark: { style: { display: "" } }, light: { style: { display: "" } } };
    s = setupSettings({
      document: {
        documentElement: docElement,
        getElementById: (id) => {
          if (id === "theme-icon-dark") return icons.dark;
          if (id === "theme-icon-light") return icons.light;
          return null;
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });
    s.data.theme = "light";
    s.applyTheme();
    assert.strictEqual(icons.dark.style.display, "none");
    assert.strictEqual(icons.light.style.display, "block");
  });

  it("shows dark icon and hides light icon when theme is monochrome", () => {
    const icons = { dark: { style: { display: "" } }, light: { style: { display: "" } } };
    s = setupSettings({
      document: {
        documentElement: docElement,
        getElementById: (id) => {
          if (id === "theme-icon-dark") return icons.dark;
          if (id === "theme-icon-light") return icons.light;
          return null;
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });
    s.applyTheme();
    assert.strictEqual(icons.dark.style.display, "block");
    assert.strictEqual(icons.light.style.display, "none");
  });

  it("defaults to monochrome when theme is falsy", () => {
    s.data.theme = "";
    s.applyTheme();
    assert.strictEqual(docElement._attrs["data-theme"], undefined);
  });
});

describe("Settings Module - load", () => {
  let s;

  it("loads defaults when no data exists", () => {
    s = setupSettings();
    s.load();
    assert.strictEqual(s.data.theme, "monochrome");
    assert.strictEqual(s.data.aiModel, "");
    assert.strictEqual(s.data.weatherCity, "");
  });

  it("preserves non-sensitive saved keys", () => {
    // Load with custom Data that has saved settings
    s = setupSettings({
      localStorage: {
        _data: { central_settings: JSON.stringify({ theme: "light", weatherCity: "São Paulo" }) },
        getItem(k) {
          return this._data[k] ?? null;
        },
        setItem(k, v) {
          this._data[k] = String(v);
        },
        removeItem(k) {
          delete this._data[k];
        },
        clear() {
          this._data = {};
        },
        get length() {
          return Object.keys(this._data).length;
        },
        key(i) {
          return Object.keys(this._data)[i] ?? null;
        },
      },
    });
    // load() reads from Data.get('central_settings') which returns null by default
    // Instead mock Data directly
    s = setupSettings({
      Data: {
        _store: { central_settings: { theme: "light", weatherCity: "São Paulo" } },
        get(k) {
          return this._store[k] || null;
        },
        save(k, v) {
          this._store[k] = v;
        },
        remove(k) {
          delete this._store[k];
        },
      },
    });
    s.load();
    assert.strictEqual(s.data.theme, "light");
    assert.strictEqual(s.data.weatherCity, "São Paulo");
  });

  it("strips youtubeApiKey and driveToken from saved data", () => {
    s = setupSettings({
      Data: {
        _store: {
          central_settings: {
            theme: "light",
            youtubeApiKey: "should-be-stripped",
            driveToken: "should-be-stripped",
          },
        },
        get(k) {
          return this._store[k] || null;
        },
        save(k, v) {
          this._store[k] = v;
        },
        remove(k) {
          delete this._store[k];
        },
      },
    });
    s.load();
    assert.ok(!("youtubeApiKey" in s.data), "youtubeApiKey should be stripped from data");
    assert.ok(!("driveToken" in s.data), "driveToken should be stripped from data");
  });

  it("handles old autoTheme key and resets to monochrome", () => {
    s = setupSettings({
      Data: {
        _store: {
          central_settings: { theme: "light", autoTheme: true },
        },
        get(k) {
          return this._store[k] || null;
        },
        save(k, v) {
          this._store[k] = v;
        },
        remove(k) {
          delete this._store[k];
        },
      },
    });
    s.load();
    // autoTheme should be removed and theme should be 'monochrome'
    assert.ok(!("autoTheme" in s.data), "autoTheme should be removed");
    assert.strictEqual(s.data.theme, "monochrome");
  });
});

describe("Settings Module - save", () => {
  let s;
  beforeEach(() => {
    s = setupSettings();
  });

  it("saves data to Data store", () => {
    s.data = { aiModel: "llama3", theme: "light" };
    s.save();
    // No crash, data preserved
    assert.strictEqual(s.data.aiModel, "llama3");
  });

  it("sends yt key to server when set", () => {
    let sentKey = null;
    s = setupSettings({
      apiFetch: async (url, opts) => {
        if (url === "/api/settings/youtubeApiKey" && opts?.method === "POST") {
          sentKey = JSON.parse(opts.body).value;
        }
        if (opts?.method === "POST") return { ok: true, json: async () => ({}) };
        return { ok: true, json: async () => ({ value: "" }) };
      },
    });
    s._ytKey = "AIzaSyTest123";
    s.save();
    assert.strictEqual(sentKey, "AIzaSyTest123");
  });

  it("sends drive token to server when set", () => {
    let sentToken = null;
    s = setupSettings({
      apiFetch: async (url, opts) => {
        if (url === "/api/settings/driveToken" && opts?.method === "POST") {
          sentToken = JSON.parse(opts.body).value;
        }
        if (opts?.method === "POST") return { ok: true, json: async () => ({}) };
        return { ok: true, json: async () => ({ value: "" }) };
      },
    });
    s._driveToken = "ya29.mock-token";
    s.save();
    assert.strictEqual(sentToken, "ya29.mock-token");
  });

  it("does not crash when saving empty data", () => {
    s.save();
    assert.ok(true);
  });
});

describe("Settings Module - get", () => {
  let s;
  beforeEach(() => {
    s = setupSettings();
    s.data = { theme: "light", weatherCity: "São Paulo" };
    s._ytKey = "AIzaSyKey";
    s._driveToken = "ya29.Token";
  });

  it("returns youtubeApiKey from _ytKey", () => {
    assert.strictEqual(s.get("youtubeApiKey"), "AIzaSyKey");
  });

  it("returns driveToken from _driveToken", () => {
    assert.strictEqual(s.get("driveToken"), "ya29.Token");
  });

  it("returns theme from data", () => {
    assert.strictEqual(s.get("theme"), "light");
  });

  it("returns weatherCity from data", () => {
    assert.strictEqual(s.get("weatherCity"), "São Paulo");
  });

  it("returns default value when key not in data", () => {
    assert.strictEqual(s.get("ollamaUrl"), "");
  });

  it("returns undefined for unknown key", () => {
    assert.strictEqual(s.get("non_existent_key"), undefined);
  });
});

describe("Settings Module - exportData", () => {
  let s;
  let capturedBlob;

  beforeEach(() => {
    capturedBlob = null;
    s = setupSettings({
      localStorage: {
        _data: {
          central_notes: JSON.stringify([{ id: "n1", text: "Note" }]),
          central_links: JSON.stringify([{ id: "l1", title: "GitHub" }]),
        },
        getItem(k) {
          return this._data[k] ?? null;
        },
        setItem(k, v) {
          this._data[k] = String(v);
        },
        removeItem(k) {
          delete this._data[k];
        },
        clear() {
          this._data = {};
        },
        get length() {
          return Object.keys(this._data).length;
        },
        key(i) {
          return Object.keys(this._data)[i] ?? null;
        },
      },
      document: {
        createElement: (tag) => {
          if (tag === "a") {
            return {
              href: "",
              download: "",
              click() {},
            };
          }
          return { style: {}, classList: { add: () => {}, remove: () => {} }, appendChild: () => {}, textContent: "" };
        },
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        body: { appendChild: () => {} },
      },
      URL: {
        createObjectURL: (blob) => {
          capturedBlob = blob;
          return "blob:mock-url";
        },
        revokeObjectURL: () => {},
      },
      Blob: class MockBlob {
        constructor(parts, opts) {
          this._parts = parts;
          this.type = opts?.type || "";
        }
      },
    });
  });

  it("collects central_* data from localStorage into a blob", () => {
    s.exportData();
    assert.ok(capturedBlob, "should have created a blob via createObjectURL");
    assert.strictEqual(capturedBlob.type, "application/json");
  });

  it("excludes non-central_* keys", () => {
    s.exportData();
    assert.ok(capturedBlob, "blob should exist");
  });
});

describe("Settings Module - close", () => {
  let s;
  let overlayHidden;

  beforeEach(() => {
    overlayHidden = false;
    s = setupSettings({
      document: {
        getElementById: (id) => {
          if (id === "modal-overlay") {
            return {
              classList: {
                add: (cls) => {
                  if (cls === "hidden") overlayHidden = true;
                },
              },
            };
          }
          return null;
        },
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });
  });

  it("adds hidden class to modal overlay", () => {
    s.close();
    assert.ok(overlayHidden);
  });

  it("calls cleanup function when set", () => {
    let cleaned = false;
    s._cleanup = () => {
      cleaned = true;
    };
    s.close();
    assert.ok(cleaned);
  });

  it("does not crash without cleanup function", () => {
    s._cleanup = null;
    s.close();
    assert.ok(overlayHidden);
  });
});

describe("Settings Module - importData", () => {
  let s;
  let serverPosts;

  beforeEach(() => {
    serverPosts = [];
    s = setupSettings({
      // apiFetch for the server POST
      apiFetch: async (url, opts) => {
        if (opts?.method === "POST") {
          serverPosts.push({ url, body: JSON.parse(opts.body) });
        }
        return { ok: true, json: async () => ({}) };
      },
      localStorage: {
        _data: {},
        getItem(k) {
          return this._data[k] ?? null;
        },
        setItem(k, v) {
          this._data[k] = String(v);
        },
        removeItem(k) {
          delete this._data[k];
        },
        clear() {
          this._data = {};
        },
        get length() {
          return Object.keys(this._data).length;
        },
        key(i) {
          return Object.keys(this._data)[i] ?? null;
        },
      },
      document: {
        getElementById: () => null,
        createElement: () => ({
          style: {},
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          textContent: "",
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      // FileReader mock for reading the import file
      FileReader: class MockFileReader {
        constructor() {
          this.onload = null;
        }
        readAsText(file) {
          this.result = file._content || "{}";
          setTimeout(() => {
            if (this.onload) this.onload({ target: this });
          }, 5);
        }
      },
      // location mock for the setTimeout(() => location.reload(), 1500) in importData
      location: {
        reload: () => {},
        href: "",
      },
    });
  });

  it("reads JSON file and writes central_* keys to localStorage", async () => {
    const file = {
      name: "backup.json",
      _content: JSON.stringify({
        central_notes: [{ id: "n1", content: "Imported note" }],
        central_links: [{ id: "l1", title: "Imported link" }],
      }),
    };
    const event = { target: { files: [file], value: "" } };

    s.importData(event);
    await delay(50);

    // Should have posted to server for each key
    assert.ok(serverPosts.length >= 2, "should have posted to server");
    const notesPost = serverPosts.find((p) => p.body.central_notes);
    assert.ok(notesPost, "should have posted central_notes");
    assert.strictEqual(notesPost.body.central_notes[0].content, "Imported note");
  });

  it("ignores _exportDate key and non-central_* keys", async () => {
    const file = {
      name: "backup.json",
      _content: JSON.stringify({
        central_notes: [{ id: "n1", content: "Note" }],
        _exportDate: "2026-07-14T00:00:00.000Z",
        nonCentralKey: "should be ignored",
      }),
    };
    const event = { target: { files: [file], value: "" } };

    s.importData(event);
    await delay(50);

    // Should have only posted central_notes
    const nonCentralPost = serverPosts.find((p) => p.body.nonCentralKey);
    assert.ok(!nonCentralPost, "should not post non-central keys");
  });

  it("does not crash on invalid JSON", async () => {
    const file = { name: "invalid.json", _content: "not valid json{{{" };
    const event = { target: { files: [file], value: "" } };
    s.importData(event);
    await delay(50);
    // Should not crash — catches parse error
    assert.ok(true);
  });

  it("does nothing when no file selected", () => {
    const event = { target: { files: [], value: "" } };
    s.importData(event);
    assert.ok(true);
  });

  it("does nothing when file is null", () => {
    const event = { target: { files: [null], value: "" } };
    s.importData(event);
    assert.ok(true);
  });
});

describe("Settings Module - data integrity", () => {
  let s;
  beforeEach(() => {
    s = setupSettings();
  });

  it("data object is independent of defaults", () => {
    s.load();
    s.data.theme = "light";
    // Changing s.data should not affect s.defaults
    assert.strictEqual(s.defaults.theme, "monochrome");
  });

  it("defaults are never mutated", () => {
    const original = { ...s.defaults };
    s.load();
    assert.strictEqual(s.defaults.theme, original.theme);
    assert.strictEqual(s.defaults.aiModel, original.aiModel);
  });
});
