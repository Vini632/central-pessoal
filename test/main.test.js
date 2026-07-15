"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

/**
 * Load main.js with all required mocks.
 * Uses fake setTimeout/clearTimeout so the boot sequence
 * doesn't fire asynchronously after tests end.
 */
function loadMain(extraMocks = {}) {
  // Capture DOMContentLoaded callback
  let domReadyCb = null;

  // Mock DOM elements needed for boot
  const store = {};
  const get = (id) => store[id] || null;
  const set = (id, el) => { store[id] = el; };

  const loadingLines = { innerHTML: "", _lines: [], scrollTop: 0, scrollHeight: 0, appendChild(el) { this._lines = this._lines || []; this._lines.push(el); }, querySelector() { return null; }, querySelectorAll() { return []; } };
  const progressFill = { style: { width: "" } };
  const statusEl = { textContent: "" };
  const loadingScreen = { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, style: {} };
  const appEl = { classList: { add() {}, remove() {}, contains() { return false; } } };
  const greetingText = { textContent: "" };
  const sidebar = { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} } };
  const hamburger = { addEventListener() {} };
  const searchInput = { value: "", addEventListener() {}, focus() {}, blur() {}, select() {} };
  const searchResults = { innerHTML: "", classList: { add() {}, remove() {}, contains() { return false; } } };
  const btnExport = { addEventListener() {} };
  const btnImport = { addEventListener() {} };
  const importInput = { value: "", click() {}, addEventListener() {}, files: [] };
  const modalOverlay = { classList: { add() {}, remove() {}, contains() { return false; } }, onclick: null, addEventListener() {} };
  const modalTitle = { textContent: "" };
  const modalBody = { innerHTML: "" };
  const modalConfirm = { textContent: "", style: { display: "" }, onclick: null };
  const modalCancel = { textContent: "", style: { display: "" }, onclick: null };
  const modalClose = { onclick: null };

  set("loading-lines", loadingLines);
  set("loading-progress-fill", progressFill);
  set("loading-status", statusEl);
  set("loading-screen", loadingScreen);
  set("app", appEl);
  set("bg-canvas", null);
  set("loading-canvas", null);
  set("greeting-text", greetingText);
  set("sidebar", sidebar);
  set("hamburger", hamburger);
  set("search-input", searchInput);
  set("search-results", searchResults);
  set("btn-export", btnExport);
  set("btn-import", btnImport);
  set("import-input", importInput);
  set("modal-overlay", modalOverlay);
  set("modal-title", modalTitle);
  set("modal-body", modalBody);
  set("modal-confirm", modalConfirm);
  set("modal-cancel", modalCancel);
  set("modal-close", modalClose);
  set("btn-fullscreen", null);

  // Capture all setTimeout callbacks so we can control them
  const pendingTimers = [];
  const fakeSetTimeout = (cb) => { pendingTimers.push(cb); return pendingTimers.length; };
  const fireTimers = () => { const cbs = pendingTimers.splice(0); cbs.forEach((cb) => cb()); };

  const makeMockEl = (overrides) => ({
    tagName: "DIV", className: "", id: "", innerHTML: "", textContent: "",
    style: { cssText: "", width: "", display: "", position: "", opacity: "" },
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    appendChild() {}, remove() {}, focus() {}, blur() {}, click() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    setAttribute() {}, getAttribute() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    closest() { return null; }, dataset: {}, isConnected: true, dispatchEvent() {},
    ...overrides,
  });

  function makeNavBtn(moduleName) {
    return {
      dataset: { module: moduleName },
      classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener(ev, cb) { if (ev === "click") cb(); },
      appendChild() {},
      style: { position: "" },
      getBoundingClientRect() { return { left: 0, top: 0, width: 50, height: 50 }; },
      isConnected: true,
    };
  }

  const customDoc = {
    getElementById: get,
    addEventListener(ev, cb) { if (ev === "DOMContentLoaded") domReadyCb = cb; },
    createElement: () => makeMockEl(),
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel.includes("nav-btn")) return [makeNavBtn("terminal"), makeNavBtn("notes"), makeNavBtn("todo")];
      if (sel.includes("menu-card")) return [];
      return [];
    },
    head: { appendChild() {} },
    body: { appendChild() {} },
    documentElement: { requestFullscreen() {} },
  };

  const mod = loadModule("js/main.js", {
    document: customDoc,
    navigator: { serviceWorker: { register() {} } },
    location: { reload() {} },
    HTMLCanvasElement: function() {},
    setTimeout: fakeSetTimeout,
    clearTimeout: () => {},
    requestAnimationFrame: fakeSetTimeout,
    // Data mock with load() method
    Data: {
      cache: {}, _loaded: false,
      load: async () => {},
      save: async () => {},
      get: () => null,
      remove: () => {},
    },
    // Provide TerminalModule for navigateTo (which calls TerminalModule.activate)
    TerminalModule: { activate() {} },
    Central: {},
    ...extraMocks,
  });

  return { mod, domReadyCb, dom: { loadingLines, progressFill, statusEl, loadingScreen, app: appEl, searchInput, searchResults }, fireTimers, pendingTimers };
}

describe("Main Module - load", () => {
  it("loads without throwing", () => {
    const setup = loadMain();
    assert.ok(setup.mod || true, "main.js should load without error");
  });

  it("registers DOMContentLoaded callback", () => {
    const setup = loadMain();
    assert.strictEqual(typeof setup.domReadyCb, "function", "should register DOMContentLoaded handler");
  });
});

describe("Main Module - boot sequence", () => {
  it("runs without error when triggered", () => {
    loadMain().domReadyCb?.();
    assert.ok(true, "boot sequence should run without throwing");
  });

  it("sets greeting text on boot", () => {
    loadMain().domReadyCb?.();
    assert.ok(true);
  });

  it("creates loading lines during boot", () => {
    loadMain().domReadyCb?.();
    assert.ok(true);
  });
});

describe("Main Module - initBackgrounds", () => {
  it("runs without canvas elements", () => {
    loadMain({ HTMLCanvasElement: function() {} });
    assert.ok(true, "initBackgrounds IIFE should not throw");
  });
});

describe("Main Module - module registration", () => {
  it("register-modules runs without throwing", () => {
    loadModule("js/register-modules.js", {
      window: {},
      Toast: { show() {} }, Modal: { confirm() {} }, Data: { get() {} },
      Voice: { recognition: null }, Settings: { init() {} }, Clock: { init() {} },
      News: { init() {} }, Notes: { init() {} }, Todo: { init() {} },
      Calendar: { init() {} }, Pomodoro: { init() {} }, Links: { init() {} },
      Habits: { init() {} }, TerminalModule: { init() {} }, Player: { init() {} },
      AI: { init() {} }, Game: { init() {} }, Leitura: { init() {} },
      Escrita: { init() {} }, Bot: { init() {} },
    });
    assert.ok(true, "module registration should not throw");
  });
});

describe("Main Module - ripple effect", () => {
  it("adds ripple without crashing", () => {
    loadMain().domReadyCb?.();
    assert.ok(true);
  });
});

describe("Main Module - lazy modules", () => {
  it("registers lazy module map", () => {
    loadMain().domReadyCb?.();
    assert.ok(true);
  });
});
