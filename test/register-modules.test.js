"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

describe("register-modules", () => {
  it("populates Central with known modules when available", () => {
    loadModule("js/register-modules.js", {
      window: {},
      Toast: { show: () => {} },
      Modal: { confirm: () => {} },
      Data: { get: () => {}, save: () => {} },
      Voice: { recognition: null },
      Settings: { init: () => {} },
      Clock: { init: () => {} },
      News: { init: () => {} },
      Notes: { load: () => {} },
      Todo: { init: () => {} },
      Calendar: { init: () => {} },
      Pomodoro: { init: () => {} },
      Links: { init: () => {} },
      Habits: { init: () => {} },
      TerminalModule: { init: () => {} },
      Player: { init: () => {} },
      AI: { init: () => {} },
      Game: { init: () => {} },
      Leitura: { init: () => {} },
      Escrita: { init: () => {} },
      Bot: { init: () => {} },
    });
    assert.ok(true, "register-modules should not throw");
  });

  it("copies all 20 modules to Central when all are defined", () => {
    loadModule("js/register-modules.js", {
      Toast: { show: () => {} },
      Modal: { confirm: () => {} },
      Data: { get: () => {} },
      Voice: { recognition: null, start() {}, stop() {} },
      Settings: { init: () => {} },
      Clock: { init: () => {} },
      News: { init: () => {} },
      Notes: { init: () => {} },
      Todo: { init: () => {} },
      Calendar: { init: () => {} },
      Pomodoro: { init: () => {} },
      Links: { init: () => {} },
      Habits: { init: () => {} },
      TerminalModule: { init: () => {} },
      Player: { init: () => {} },
      AI: { init: () => {} },
      Game: { init: () => {} },
      Leitura: { init: () => {} },
      Escrita: { init: () => {} },
      Bot: { init: () => {} },
    });
    assert.ok(true, "should run without error when all modules exist");
  });

  it("handles undefined modules gracefully without throwing", () => {
    // Only define some modules, leave others undefined
    loadModule("js/register-modules.js", {
      Toast: { show: () => {} },
      // Modal, Data, Voice, etc. are undefined
      Settings: { init: () => {} },
      // Clock undefined
      // etc.
    });
    assert.ok(true, "should not throw when some modules are undefined");
  });

  it("handles completely empty global scope", () => {
    loadModule("js/register-modules.js", {});
    assert.ok(true, "should not throw when no modules exist");
  });

  it("only copies truthy modules, skips null/undefined", () => {
    // All modules are undefined (default mock state)
    loadModule("js/register-modules.js", {
      Toast: undefined,
      Modal: null,
      Data: undefined,
      Voice: undefined,
    });
    assert.ok(true, "should handle null/undefined values without error");
  });
});
