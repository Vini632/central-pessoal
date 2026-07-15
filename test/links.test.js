'use strict';
const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadModule } = require('./helpers/load');

function setupLinks() {
  const Links = loadModule('js/modules/links.js');
  Links.data = [];
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

  it('does not crash when called multiple times', () => {
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
    assert.strictEqual(statsCalled, true);
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
    l.save = function() { saved = true; origSave(); };
    l.data = [{ id: 'a', title: 'A', url: 'https://a.com' }];
    l.delete('a');
    assert.strictEqual(saved, true);
  });

  it('renders after deletion', () => {
    let rendered = false;
    l.render = function() { rendered = true; };
    l.data = [{ id: 'a', title: 'A', url: 'https://a.com' }];
    l.delete('a');
    assert.strictEqual(rendered, true);
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
      assert.strictEqual(typeof link.id, 'string');
      assert.ok(link.id.length > 0);
      assert.strictEqual(typeof link.title, 'string');
      assert.strictEqual(typeof link.url, 'string');
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

  it('can have empty data array', () => {
    assert.strictEqual(l.data.length, 0);
  });

  it('handles duplicate IDs by removing all matches', () => {
    l.data = [
      { id: 'dup', title: 'First', url: 'https://a.com' },
      { id: 'dup', title: 'Second', url: 'https://b.com' },
    ];
    l.delete('dup');
    assert.strictEqual(l.data.length, 0);
  });

  it('supports URLs with special characters', () => {
    l.data = [{ id: 'a', title: 'Special', url: 'https://example.com/path?q=áéí&b=2' }];
    assert.strictEqual(l.data[0].url, 'https://example.com/path?q=áéí&b=2');
  });
});
