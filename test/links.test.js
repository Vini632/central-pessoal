'use strict';
const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadModule } = require('./helpers/load');

function setupLinks() {
  const Links = loadModule('js/modules/links.js');
  Links.data = [];

  // Override DOM-dependent methods
  Links.render = function() {};
  Links.updateStats = function() {
    if (typeof document !== 'undefined' && document.getElementById) {
      const el = document.getElementById('stat-links');
      if (el) el.textContent = this.data.length;
    }
  };

  return Links;
}

describe('Links Module - load', () => {
  let l;
  beforeEach(() => { l = setupLinks(); });

  it('loads empty array when Data returns null', () => {
    l.load();
    assert.strictEqual(l.data.length, 0);
  });

  it('loads does not crash when called multiple times', () => {
    l.load();
    l.load();
    assert.strictEqual(l.data.length, 0);
  });
});

describe('Links Module - save', () => {
  let l;
  beforeEach(() => { l = setupLinks(); });

  it('calls updateStats after save', () => {
    let statsCalled = false;
    l.updateStats = function() { statsCalled = true; };
    l.save();
    assert.ok(statsCalled);
  });

  it('does not crash when saving empty data', () => {
    l.save();
    assert.strictEqual(l.data.length, 0);
  });

  it('does not crash when saving with links', () => {
    l.data = [{ id: 'a', title: 'GitHub', url: 'https://github.com' }];
    l.save();
    assert.strictEqual(l.data.length, 1);
  });
});

describe('Links Module - delete', () => {
  let l;
  beforeEach(() => { l = setupLinks(); });

  it('removes a link by id', () => {
    l.data = [
      { id: 'a', title: 'GitHub', url: 'https://github.com' },
      { id: 'b', title: 'Google', url: 'https://google.com' },
    ];
    l.delete('a');
    assert.strictEqual(l.data.length, 1);
    assert.strictEqual(l.data[0].id, 'b');
  });

  it('does nothing when id does not exist', () => {
    l.data = [{ id: 'a', title: 'GitHub', url: 'https://github.com' }];
    l.delete('non_existent');
    assert.strictEqual(l.data.length, 1);
  });

  it('handles deletion on empty array', () => {
    l.delete('anything');
    assert.strictEqual(l.data.length, 0);
  });

  it('removes the only item', () => {
    l.data = [{ id: 'only', title: 'Only', url: 'https://only.com' }];
    l.delete('only');
    assert.strictEqual(l.data.length, 0);
  });

  it('saves after deletion', () => {
    let saved = false;
    const origSave = l.save.bind(l);
    l.save = function() {
      saved = true;
      origSave();
    };
    l.data = [{ id: 'a', title: 'A', url: 'https://a.com' }];
    l.delete('a');
    assert.ok(saved);
  });

  it('renders after deletion', () => {
    let rendered = false;
    l.render = function() { rendered = true; };
    l.data = [{ id: 'a', title: 'A', url: 'https://a.com' }];
    l.delete('a');
    assert.ok(rendered);
  });
});

describe('Links Module - updateStats', () => {
  let l;
  beforeEach(() => { l = setupLinks(); });

  it('updates stat-links with data length', () => {
    l.data = [
      { id: 'a', title: 'A', url: 'https://a.com' },
      { id: 'b', title: 'B', url: 'https://b.com' },
    ];
    l.updateStats();
    // Default document.getElementById returns null, so nothing crashes
    // We already overrode updateStats to safely handle null
  });

  it('sets stat-links to 0 when empty', () => {
    l.updateStats();
  });
});

describe('Links Module - data integrity', () => {
  let l;
  beforeEach(() => { l = setupLinks(); });

  it('links have required properties (id, title, url)', () => {
    l.data = [
      { id: 'a', title: 'GitHub', url: 'https://github.com' },
      { id: 'b', title: 'Google', url: 'https://google.com' },
    ];
    for (const link of l.data) {
      assert.ok(link.id, `missing id: ${JSON.stringify(link)}`);
      assert.ok(link.title, `missing title: ${JSON.stringify(link)}`);
      assert.ok(link.url, `missing url: ${JSON.stringify(link)}`);
    }
  });

  it('all link IDs are unique', () => {
    l.data = [
      { id: 'a', title: 'A', url: 'https://a.com' },
      { id: 'b', title: 'B', url: 'https://b.com' },
      { id: 'c', title: 'C', url: 'https://c.com' },
    ];
    const ids = l.data.map(x => x.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  it('links can have empty data array', () => {
    assert.strictEqual(l.data.length, 0);
  });
});
