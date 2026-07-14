'use strict';
const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadModule } = require('./helpers/load');

function setupTerminal(extraMocks = {}) {
  const TerminalModule = loadModule('js/modules/terminal.js', {
    WebSocket: { OPEN: 1 },
    ...extraMocks,
  });
  const t = TerminalModule;

  // Reset state
  t.inputBuffer = '';
  t.ws = null;
  t.isRawMode = false;

  // Set up output buffer for testing writeln
  t.output = {
    _lines: [],
    appendChild(el) {
      this._lines.push(el);
    },
    set innerHTML(val) {
      this._lines = [];
      this._html = val;
    },
    get innerHTML() { return this._html || ''; },
    scrollTop: 0,
    scrollHeight: 0,
    _html: '',
  };

  // Override DOM-dependent init/activate methods
  t.init = function() {};
  t.activate = function() {};
  t.autoConnect = function() {};

  // Keep handleSubmit as original (no DOM deps, works with mock input)
  // Keep writeln as original (uses this.output.appendChild)

  return t;
}

function lines(t) {
  return t.output._lines.map(el => el.textContent);
}

describe('Terminal Module - writeln', () => {
  let t;
  beforeEach(() => { t = setupTerminal(); });

  it('adds a line to the output', () => {
    t.writeln('Hello');
    assert.strictEqual(t.output._lines.length, 1);
    assert.strictEqual(t.output._lines[0].textContent, 'Hello');
  });

  it('appends multiple lines', () => {
    t.writeln('Line 1');
    t.writeln('Line 2');
    t.writeln('Line 3');
    assert.strictEqual(t.output._lines.length, 3);
    assert.strictEqual(lines(t)[1], 'Line 2');
  });

  it('sets className to term-line', () => {
    t.writeln('test');
    assert.strictEqual(t.output._lines[0].className, 'term-line');
  });

  it('handles empty strings', () => {
    t.writeln('');
    assert.strictEqual(t.output._lines.length, 1);
    assert.strictEqual(t.output._lines[0].textContent, '');
  });

  it('handles special characters', () => {
    t.writeln('Olá, mundo! çáéíóú');
    assert.strictEqual(t.output._lines[0].textContent, 'Olá, mundo! çáéíóú');
  });

  it('scrolls to bottom', () => {
    t.output.scrollTop = 0;
    t.output.scrollHeight = 500;
    t.writeln('test');
    assert.strictEqual(t.output.scrollTop, 500);
  });
});

describe('Terminal Module - execLocal', () => {
  let t;
  beforeEach(() => { t = setupTerminal(); });

  it('executes help command and lists available commands', () => {
    t.execLocal('help');
    const out = lines(t);
    assert.ok(out.some(l => l.includes('help')), 'should list help command');
    assert.ok(out.some(l => l.includes('clear')), 'should list clear command');
    assert.ok(out.some(l => l.includes('echo')), 'should list echo command');
    assert.ok(out.some(l => l.includes('date')), 'should list date command');
    assert.ok(out.some(l => l.includes('connect')), 'should list connect command');
  });

  it('executes clear command and clears output', () => {
    t.writeln('some text');
    assert.strictEqual(t.output._lines.length, 1);
    t.execLocal('clear');
    assert.strictEqual(t.output._lines.length, 0);
  });

  it('executes echo command', () => {
    t.execLocal('echo Hello World');
    assert.strictEqual(lines(t)[0], 'Hello World');
  });

  it('executes echo with empty args', () => {
    t.execLocal('echo');
    assert.strictEqual(lines(t)[0], '');
  });

  it('executes date command', () => {
    t.execLocal('date');
    const line = lines(t)[0];
    assert.ok(line, 'date should produce output');
    const hasDateChars = /\d/.test(line);
    assert.ok(hasDateChars, `date output should contain digits: "${line}"`);
  });

  it('shows error for unknown command', () => {
    t.execLocal('nonexistent');
    const line = lines(t)[0];
    assert.ok(line.includes('nao encontrado') || line.includes('não encontrado'), `should show not found: "${line}"`);
  });

  it('is case-insensitive for commands', () => {
    t.execLocal('ECHO test');
    assert.strictEqual(lines(t)[0], 'test');
  });

  it('executes echo with multiple words', () => {
    t.execLocal('echo this is a test');
    assert.strictEqual(lines(t)[0], 'this is a test');
  });
});

describe('Terminal Module - handleSubmit', () => {
  let t;
  beforeEach(() => { t = setupTerminal(); });

  it('does nothing for empty input', () => {
    t.input = { value: '' };
    t.handleSubmit();
    assert.strictEqual(t.output._lines.length, 0);
  });

  it('writes the command with $ prefix and executes locally', () => {
    t.input = { value: 'echo hi' };
    t.ws = null;
    t.handleSubmit();
    const out = lines(t);
    assert.strictEqual(out[0], '$ echo hi');
    assert.strictEqual(out[1], 'hi');
  });

  it('sends via WebSocket when connected', () => {
    let sent = null;
    t.input = { value: 'ls -la' };
    t.ws = { readyState: 1, send: (msg) => { sent = msg; } };
    t.handleSubmit();
    assert.strictEqual(sent, 'ls -la\r\n');
  });

  it('clears input after submit', () => {
    t.input = { value: 'echo hi' };
    t.handleSubmit();
    assert.strictEqual(t.input.value, '');
  });

  it('throws when input is null', () => {
    t.input = null;
    assert.throws(() => t.handleSubmit());
  });
});

describe('Terminal Module - weather command', () => {
  let t;
  beforeEach(() => {
    t = setupTerminal({
      document: {
        getElementById: (id) => {
          if (id === 'weather-temp') return { textContent: '25°C' };
          if (id === 'weather-desc') return { textContent: 'Ensolarado' };
          if (id === 'weather-city') return { textContent: 'São Paulo' };
          return null;
        },
        createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, appendChild: () => {} }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    });
  });

  it('shows weather info from DOM elements', () => {
    t.execLocal('weather');
    const line = lines(t)[0];
    assert.ok(line.includes('25°C'), `should include temp: "${line}"`);
    assert.ok(line.includes('Ensolarado'), `should include desc: "${line}"`);
    assert.ok(line.includes('São Paulo'), `should include city: "${line}"`);
  });
});

describe('Terminal Module - news command', () => {
  let t;
  beforeEach(() => {
    t = setupTerminal({
      document: {
        getElementById: () => null,
        createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, appendChild: () => {} }),
        querySelector: () => null,
        querySelectorAll: (sel) => {
          if (sel === '#news-list .news-card') {
            const card = {
              querySelector: (s) => {
                if (s === '.news-title a') return { textContent: 'Breaking News!' };
                return null;
              },
            };
            return [card, card];
          }
          return [];
        },
      },
    });
  });

  it('shows message when no news cards exist', () => {
    t = setupTerminal(); // reset with default (no mock -> null querySelectorAll)
    t.execLocal('news');
    const line = lines(t)[0];
    assert.ok(line.includes('Nenhuma'), `should show no news: "${line}"`);
  });

  it('reads titles from news cards', () => {
    t.execLocal('news');
    const out = lines(t);
    assert.strictEqual(out.length, 2);
    assert.ok(out[0].includes('1.'), 'should have numbered list');
    assert.ok(out[0].includes('Breaking'), 'should show title');
  });
});

describe('Terminal Module - notes command', () => {
  let t;
  beforeEach(() => { t = setupTerminal(); });

  it('shows message when no notes exist', () => {
    t.execLocal('notes');
    const line = lines(t)[0];
    assert.ok(line.includes('Nenhuma'), `should show no notes: "${line}"`);
  });
});

describe('Terminal Module - links command', () => {
  let t;
  beforeEach(() => { t = setupTerminal(); });

  it('shows message when no links exist', () => {
    t.execLocal('links');
    const line = lines(t)[0];
    assert.ok(line.includes('Nenhum'), `should show no links: "${line}"`);
  });
});

describe('Terminal Module - connect command', () => {
  let t;
  beforeEach(() => { t = setupTerminal(); });

  it('shows connection attempt message', () => {
    t.execLocal('connect ws://localhost:9999');
    const line = lines(t)[0];
    assert.ok(line.includes('Conectando'), `should show connecting: "${line}"`);
  });
});
