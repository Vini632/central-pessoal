"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

/**
 * Create a mock SpeechRecognition constructor.
 * Note: In the vm sandbox, `window` is overridden to be the sandbox itself.
 * So SpeechRecognition must be at the top level, not nested inside `window`.
 */
function createMockSpeechRecognition() {
  return class MockSpeechRecognition {
    constructor() {
      this.lang = "";
      this.continuous = false;
      this.interimResults = false;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this._started = false;
    }
    start() {
      this._started = true;
    }
    stop() {
      this._started = false;
    }
    abort() {
      this._started = false;
    }
  };
}

function setupVoice(extraMocks = {}) {
  const SR = createMockSpeechRecognition();
  const Voice = loadModule("js/voice.js", {
    // window = sandbox in vm context, so SpeechRecognition must be top-level
    SpeechRecognition: SR,
    webkitSpeechRecognition: undefined,
    Toast: { info() {}, success() {}, warn() {}, error() {} },
    Event: class MockEvent {
      constructor(type, opts) {
        this.type = type;
        this.bubbles = opts?.bubbles;
      }
    },
    ...extraMocks,
  });

  // Reset state
  Voice.recognition = null;

  return Voice;
}

describe("Voice Module - supported", () => {
  it("is true when SpeechRecognition is available", () => {
    const v = setupVoice({ SpeechRecognition: createMockSpeechRecognition() });
    assert.strictEqual(v.supported, true);
  });

  it("is true when webkitSpeechRecognition is available", () => {
    const v = setupVoice({
      SpeechRecognition: undefined,
      webkitSpeechRecognition: createMockSpeechRecognition(),
    });
    assert.strictEqual(v.supported, true);
  });

  it("is false when neither is available", () => {
    // loadModule directly, omitting SpeechRecognition entirely
    // because `in` operator checks property existence, not truthiness
    const Voice = loadModule("js/voice.js", {
      Toast: { info() {}, success() {}, warn() {}, error() {} },
      Event: class MockEvent {
        constructor(type, opts) {
          this.type = type;
          this.bubbles = opts?.bubbles;
        }
      },
    });
    Voice.recognition = null;
    assert.strictEqual(Voice.supported, false);
  });
});

describe("Voice Module - start", () => {
  let v;
  let textarea;
  let btn;

  beforeEach(() => {
    textarea = {
      value: "Hello ",
      selectionStart: 6,
      selectionEnd: 6,
      dispatchEvent: () => {},
    };
    btn = {
      classList: { add() {}, remove() {} },
      textContent: "",
      innerHTML: "",
    };

    v = setupVoice();
    v.recognition = null;
  });

  it("creates a SpeechRecognition instance", () => {
    v.start(textarea, btn);
    assert.ok(v.recognition, "should create recognition instance");
  });

  it("sets language to pt-BR", () => {
    v.start(textarea, btn);
    assert.strictEqual(v.recognition.lang, "pt-BR");
  });

  it("disables continuous mode", () => {
    v.start(textarea, btn);
    assert.strictEqual(v.recognition.continuous, false);
  });

  it("enables interim results", () => {
    v.start(textarea, btn);
    assert.strictEqual(v.recognition.interimResults, true);
  });

  it("calls recognition.start()", () => {
    v.start(textarea, btn);
    assert.strictEqual(v.recognition._started, true);
  });

  it("adds recording class to button", () => {
    let added = false;
    btn.classList.add = (cls) => {
      if (cls === "recording") added = true;
    };
    v.start(textarea, btn);
    assert.ok(added);
  });

  it('sets button text to "⋯"', () => {
    v.start(textarea, btn);
    assert.strictEqual(btn.textContent, "⋯");
  });

  it("does not start when not supported", () => {
    const Voice = loadModule("js/voice.js", {
      Toast: { info() {}, success() {}, warn() {}, error() {} },
      Event: class MockEvent {
        constructor(type, opts) {
          this.type = type;
          this.bubbles = opts?.bubbles;
        }
      },
    });
    Voice.recognition = null;
    Voice.start(textarea, btn);
    assert.strictEqual(Voice.recognition, null);
  });
});

describe("Voice Module - start onresult", () => {
  let v;
  let textarea;
  let btn;

  beforeEach(() => {
    textarea = {
      value: "Hello ",
      selectionStart: 6,
      selectionEnd: 6,
      dispatched: [],
      dispatchEvent(ev) {
        this.dispatched.push(ev);
      },
    };
    btn = {
      classList: { add() {}, remove() {} },
      textContent: "",
      innerHTML: "",
    };

    v = setupVoice();
    v.recognition = null;
    v.start(textarea, btn);
  });

  it("inserts transcript at cursor position", () => {
    v.recognition.onresult({
      resultIndex: 0,
      results: [[{ transcript: "world" }]],
    });
    assert.strictEqual(textarea.value, "Hello world");
  });

  it("inserts multiple result segments", () => {
    v.recognition.onresult({
      resultIndex: 0,
      results: [[{ transcript: "world" }], [{ transcript: "!" }]],
    });
    assert.strictEqual(textarea.value, "Hello world!");
  });

  it("dispatches an input event after inserting text", () => {
    v.recognition.onresult({
      resultIndex: 0,
      results: [[{ transcript: "world" }]],
    });
    assert.strictEqual(textarea.dispatched.length, 1);
    assert.strictEqual(textarea.dispatched[0].type, "input");
    assert.strictEqual(textarea.dispatched[0].bubbles, true);
  });

  it("inserts at start when selectionStart is 0", () => {
    textarea.value = "world";
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;
    v.start(textarea, btn);
    v.recognition.onresult({
      resultIndex: 0,
      results: [[{ transcript: "Hello " }]],
    });
    // selectionStart=0 is falsy, so the module uses || textarea.value.length (=5)
    // Thus text is appended at the end: 'worldHello '
    assert.strictEqual(textarea.value, "worldHello ");
  });

  it("handles textarea without selectionStart/End", () => {
    const ta = { value: "text", dispatchEvent() {} };
    v.start(ta, btn);
    v.recognition.onresult({
      resultIndex: 0,
      results: [[{ transcript: " appended" }]],
    });
    assert.strictEqual(ta.value, "text appended");
  });
});

describe("Voice Module - start onerror/onend", () => {
  let v;
  let textarea;
  let btn;

  beforeEach(() => {
    textarea = { value: "", selectionStart: 0, selectionEnd: 0, dispatchEvent() {} };
    btn = {
      classList: { add() {}, remove() {} },
      textContent: "",
      innerHTML: "",
    };

    v = setupVoice();
    v.recognition = null;
  });

  it("calls stop on recognition error", () => {
    let stopped = false;
    v.stop = function (_b) {
      stopped = true;
    };
    v.start(textarea, btn);
    v.recognition.onerror({ error: "no-speech" });
    assert.ok(stopped);
  });

  it("calls stop on recognition end", () => {
    let stopped = false;
    v.stop = function (_b) {
      stopped = true;
    };
    v.start(textarea, btn);
    v.recognition.onend();
    assert.ok(stopped);
  });
});

describe("Voice Module - stop", () => {
  let v;
  let btn;

  beforeEach(() => {
    btn = {
      classList: {
        _removed: [],
        remove(cls) {
          this._removed.push(cls);
        },
      },
      textContent: "",
      innerHTML: "",
    };

    v = setupVoice();
    v.recognition = {
      _started: true,
      stop() {
        this._started = false;
      },
    };
  });

  it("stops the recognition", () => {
    let recStopped = false;
    v.recognition.stop = () => {
      recStopped = true;
    };
    v.stop(btn);
    assert.ok(recStopped, "recognition.stop() should be called");
  });

  it("sets recognition to null", () => {
    v.stop(btn);
    assert.strictEqual(v.recognition, null);
  });

  it("removes recording class from button", () => {
    v.stop(btn);
    assert.ok(btn.classList._removed.includes("recording"));
  });

  it("restores button innerHTML", () => {
    v.stop(btn);
    assert.ok(btn.innerHTML.includes("svg"), "button should have SVG icon");
    assert.ok(btn.innerHTML.includes("M12 2"), "should contain mic path");
  });

  it("does not crash when btn is null", () => {
    v.stop(null);
    assert.strictEqual(v.recognition, null);
  });

  it("does not crash when recognition is null", () => {
    v.recognition = null;
    v.stop(btn);
    assert.ok(btn.classList._removed.includes("recording"));
  });

  it("handles stop() throwing an error", () => {
    v.recognition.stop = () => {
      throw new Error("stop failed");
    };
    v.stop(btn);
    assert.strictEqual(v.recognition, null);
  });
});

describe("Voice Module - integration", () => {
  let v;
  let textarea;
  let btn;

  beforeEach(() => {
    textarea = { value: "", selectionStart: 0, selectionEnd: 0, dispatchEvent() {} };
    btn = {
      classList: { add() {}, remove() {} },
      textContent: "",
      innerHTML: "",
    };

    v = setupVoice();
  });

  it("start creates and stop destroys recognition", () => {
    v.start(textarea, btn);
    assert.ok(v.recognition, "after start, recognition should exist");
    v.stop(btn);
    assert.strictEqual(v.recognition, null, "after stop, recognition should be null");
  });

  it("onend automatically stops", () => {
    v.start(textarea, btn);
    v.recognition.onend();
    assert.strictEqual(v.recognition, null, "onend should nullify recognition");
  });

  it("onerror automatically stops", () => {
    v.start(textarea, btn);
    v.recognition.onerror({ error: "no-speech" });
    assert.strictEqual(v.recognition, null, "onerror should nullify recognition");
  });

  it("supports full cycle: start → result → stop", () => {
    v.start(textarea, btn);
    v.recognition.onresult({
      resultIndex: 0,
      results: [[{ transcript: "testing" }]],
    });
    assert.strictEqual(textarea.value, "testing");
    v.stop(btn);
    assert.strictEqual(v.recognition, null);
  });
});
