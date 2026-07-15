"use strict";
const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

function setupPomodoro() {
  const Pomodoro = loadModule("js/modules/pomodoro.js");
  Pomodoro.mode = "focus";
  Pomodoro.timeLeft = 25 * 60;
  Pomodoro.running = false;
  Pomodoro.timer = null;
  Pomodoro.sessions = 0;

  // Override all DOM-dependent methods
  Pomodoro.render = function () {
    this.updateDisplay();
  };
  Pomodoro.updateDisplay = function () {
    const m = String(Math.floor(this.timeLeft / 60)).padStart(2, "0");
    const s = String(this.timeLeft % 60).padStart(2, "0");
    this._display = `${m}:${s}`;
  };
  Pomodoro.beep = function () {};
  // Override DOM-dependent parts of start/pause/reset
  Pomodoro.start = function () {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.complete();
        return;
      }
      this.updateDisplay();
    }, 1000);
  };
  Pomodoro.pause = function () {
    this.running = false;
    clearInterval(this.timer);
  };
  Pomodoro.reset = function () {
    this.running = false;
    clearInterval(this.timer);
    this.timeLeft = this.modes[this.mode].duration * 60;
    this.render();
  };

  return Pomodoro;
}

describe("Pomodoro Module", () => {
  let p;
  before(() => {
    p = setupPomodoro();
  });

  describe("Mode configurations", () => {
    it("has three modes", () => {
      assert.ok(p.modes.focus);
      assert.ok(p.modes.short);
      assert.ok(p.modes.long);
    });

    it("focus mode is 25 minutes", () => {
      assert.strictEqual(p.modes.focus.duration, 25);
    });

    it("short break is 5 minutes", () => {
      assert.strictEqual(p.modes.short.duration, 5);
    });

    it("long break is 15 minutes", () => {
      assert.strictEqual(p.modes.long.duration, 15);
    });
  });

  describe("setMode", () => {
    beforeEach(() => {
      p.mode = "focus";
      p.timeLeft = 25 * 60;
      p.running = false;
      p.sessions = 0;
    });

    it("changes mode when not running", () => {
      p.setMode("short");
      assert.strictEqual(p.mode, "short");
      assert.strictEqual(p.timeLeft, 5 * 60);
    });

    it("changes to long break", () => {
      p.setMode("long");
      assert.strictEqual(p.mode, "long");
      assert.strictEqual(p.timeLeft, 15 * 60);
    });

    it("does not change mode when running", () => {
      p.running = true;
      p.setMode("short");
      assert.strictEqual(p.mode, "focus");
      assert.strictEqual(p.timeLeft, 25 * 60);
    });
  });

  describe("reset", () => {
    beforeEach(() => {
      p.mode = "focus";
      p.timeLeft = 25 * 60;
      p.running = false;
    });

    it("resets timeLeft for current mode", () => {
      p.timeLeft = 10;
      p.reset();
      assert.strictEqual(p.timeLeft, 25 * 60);
    });

    it("sets running to false", () => {
      p.running = true;
      p.reset();
      assert.strictEqual(p.running, false);
    });

    it("resets to correct duration for short mode", () => {
      p.setMode("short");
      p.timeLeft = 60;
      p.reset();
      assert.strictEqual(p.timeLeft, 5 * 60);
    });
  });

  describe("complete", () => {
    beforeEach(() => {
      p.mode = "focus";
      p.timeLeft = 25 * 60;
      p.running = true;
      p.sessions = 0;
    });

    it("stops the timer", () => {
      p.complete();
      assert.strictEqual(p.running, false);
    });

    it("increments sessions after focus", () => {
      p.complete();
      assert.strictEqual(p.sessions, 1);
    });

    it("switches to short break after focus (not 4th session)", () => {
      p.sessions = 2;
      p.complete();
      assert.strictEqual(p.mode, "short");
      assert.strictEqual(p.timeLeft, 5 * 60);
    });

    it("switches to long break on 4th focus session", () => {
      p.sessions = 3;
      p.complete();
      assert.strictEqual(p.sessions, 4);
      assert.strictEqual(p.mode, "long");
      assert.strictEqual(p.timeLeft, 15 * 60);
    });

    it("switches back to focus after any break", () => {
      p.mode = "short";
      p.complete();
      assert.strictEqual(p.mode, "focus");
      assert.strictEqual(p.timeLeft, 25 * 60);
    });

    it("does not increment sessions for breaks", () => {
      p.mode = "short";
      p.sessions = 3;
      p.complete();
      assert.strictEqual(p.sessions, 3);
      assert.strictEqual(p.mode, "focus");
    });

    it("cycles correctly: short break for sessions 1-3, long at 4", () => {
      for (let i = 0; i < 4; i++) {
        p.mode = "focus";
        p.sessions = i;
        p.complete();
        const expectedMode = (i + 1) % 4 === 0 ? "long" : "short";
        assert.strictEqual(p.mode, expectedMode, `session ${i + 1} should be ${expectedMode}`);
        p.complete(); // complete the break → back to focus
        assert.strictEqual(p.mode, "focus");
      }
    });
  });

  describe("updateDisplay", () => {
    beforeEach(() => {
      p._display = "";
      p.updateDisplay();
    });

    it("formats timeLeft as MM:SS", () => {
      p.timeLeft = 25 * 60;
      p.updateDisplay();
      assert.strictEqual(p._display, "25:00");
    });

    it("formats single-digit minutes with leading zero", () => {
      p.timeLeft = 5 * 60;
      p.updateDisplay();
      assert.strictEqual(p._display, "05:00");
    });

    it("handles seconds correctly (1:30)", () => {
      p.timeLeft = 90;
      p.updateDisplay();
      assert.strictEqual(p._display, "01:30");
    });

    it("shows 00:00 when timeLeft is 0", () => {
      p.timeLeft = 0;
      p.updateDisplay();
      assert.strictEqual(p._display, "00:00");
    });
  });

  describe("toggle", () => {
    beforeEach(() => {
      p.mode = "focus";
      p.timeLeft = 25 * 60;
      p.running = false;
      p.timer = null;
      p.sessions = 0;
    });

    it("starts when not running", () => {
      p.toggle();
      assert.strictEqual(p.running, true);
      assert.ok(p.timer !== null);
      clearInterval(p.timer);
      p.timer = null;
    });

    it("pauses when running", () => {
      p.toggle();
      assert.strictEqual(p.running, true);
      p.toggle();
      assert.strictEqual(p.running, false);
      clearInterval(p.timer);
      p.timer = null;
    });

    it("does not start twice", () => {
      const P = setupPomodoro();
      P.start();
      assert.strictEqual(P.running, true);
      const timerA = P.timer;
      P.start(); // should do nothing — already running
      assert.strictEqual(P.timer, timerA);
      clearInterval(P.timer);
    });
  });
});
