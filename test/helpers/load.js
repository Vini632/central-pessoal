'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

/**
 * Load a vanilla-JS browser module file into a VM sandbox with mocks.
 * Returns the module object (e.g. Game, AI, Calendar).
 *
 * @param {string} moduleRelPath - Path relative to project root, e.g. 'js/modules/game.js'
 * @param {object} extraMocks  - Additional mocks to merge into sandbox
 * @returns {object} The module (e.g. Game, AI, Calendar)
 */
function loadModule(moduleRelPath, extraMocks = {}) {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const code = fs.readFileSync(path.join(projectRoot, moduleRelPath), 'utf-8');

  const sandbox = {
    // Node.js built-ins
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout,
    clearInterval,
    setInterval,
    Math, Date, JSON, parseInt, parseFloat, String, Number, Boolean,
    isNaN, encodeURIComponent, decodeURIComponent,
    RegExp, Array, Object, Map, Set, Promise,
    URL, URLSearchParams,

    // Browser mocks
    window: {},
    document: {
      getElementById: () => null,
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        setAttribute: () => {},
        getAttribute: () => null,
        focus: () => {},
        scrollIntoView: () => {},
        textContent: '',
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
    Notification: { permission: 'default', requestPermission() {} },

    // App-specific mocks
    Data: {
      _store: {},
      get(k) { return this._store[k] ?? null; },
      save(k, v) { this._store[k] = v; },
      remove(k) { delete this._store[k]; },
    },
    Toast: { info() {}, success() {}, warn() {}, error() {} },
    Modal: {
      confirm: async () => true,
      prompt: async () => '',
    },
    Settings: { get: () => null },
    Voice: { recognition: null, start() {}, stop() {} },

    // fetch mock
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      headers: { get: () => null },
    }),

    ...extraMocks,
  };

  sandbox.window = sandbox;
  sandbox.global = sandbox;

  vm.createContext(sandbox);

  // Top-level `const` in vm.runInContext does NOT create sandbox properties in Node 24.
  // Workaround: find the top-level const name and append an explicit property assignment.
  const constMatch = code.match(/^const\s+(\w+)\s*=[\s\S]*?^;/m);
  // More reliable: find all top-level consts by looking for `const X =` at line start
  const constNames = [...code.matchAll(/^const\s+(\w+)\s*=/gm)].map(m => m[1]);

  let wrappedCode = code;
  if (constNames.length > 0) {
    wrappedCode += '\n;' + constNames.map(n => `this.${n} = ${n};`).join('\n');
  }

  try {
    vm.runInContext(wrappedCode, sandbox, { filename: moduleRelPath });
  } catch (e) {
    throw new Error(`Failed to load ${moduleRelPath}: ${e.message}`);
  }

  // Return the first top-level const as the module
  if (constNames.length > 0) {
    const moduleObj = sandbox[constNames[0]];
    if (moduleObj) return moduleObj;
  }

  // Fallback: return whole sandbox
  return sandbox;
}

module.exports = { loadModule };
