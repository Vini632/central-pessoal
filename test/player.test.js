'use strict';
const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadModule } = require('./helpers/load');

function setupPlayer() {
  const Player = loadModule('js/modules/player.js');

  // Reset state
  Player.queue = [];
  Player.queueIndex = -1;
  Player.history = [];
  Player.playlists = [];
  Player.isPlaying = false;
  Player.ctx = null;
  Player.active = {};
  Player.masterGain = null;

  // Override DOM-dependent methods
  Player.saveQueue = function() {};
  Player.renderQueue = function() {};
  Player.saveHistory = function() {};
  Player.renderHistory = function() {};
  Player.savePlaylists = function() {};
  Player.renderPlaylists = function() {};
  Player.playVideo = function(id, title) {
    this.isPlaying = true;
    this._lastPlayed = { id, title };
  };
  Player.updatePlayBtn = function() {};
  Player.embedPlaylist = function(listId) {
    this._lastPlaylist = listId;
  };
  Player.createPlaylist = function(name) {
    if (!name || !name.trim()) return;
    const id = Date.now().toString(36);
    this.playlists.push({ id, name: name.trim(), videos: [], created: Date.now() });
    this.savePlaylists();
    this.renderPlaylists();
    return id;
  };

  return Player;
}

function assertVideo(result, id) {
  assert.ok(result, 'expected non-null result');
  assert.strictEqual(result.type, 'video');
  assert.strictEqual(result.id, id);
}

function assertPlaylist(result, id) {
  assert.ok(result, 'expected non-null result');
  assert.strictEqual(result.type, 'playlist');
  assert.strictEqual(result.id, id);
}

// ── Standard YouTube test IDs ──
const VIDEO_ID = 'dQw4w9WgXcQ';
const PLAYLIST_ID = 'PLrAXtmErZgOeiKm4sgNOkn73Gfb1Dq5yM';

describe('Player Module - extractId', () => {
  let p;
  before(() => { p = setupPlayer(); });

  it('parses a raw 11-char video ID', () => {
    assertVideo(p.extractId(VIDEO_ID), VIDEO_ID);
  });

  it('parses a standard youtube.com URL', () => {
    assertVideo(p.extractId(`https://www.youtube.com/watch?v=${VIDEO_ID}`), VIDEO_ID);
  });

  it('parses a youtu.be short URL', () => {
    assertVideo(p.extractId(`https://youtu.be/${VIDEO_ID}`), VIDEO_ID);
  });

  it('parses a music.youtube.com URL (YouTube Music)', () => {
    assertVideo(p.extractId(`https://music.youtube.com/watch?v=${VIDEO_ID}`), VIDEO_ID);
  });

  it('parses a playlist URL', () => {
    assertPlaylist(p.extractId(`https://www.youtube.com/playlist?list=${PLAYLIST_ID}`), PLAYLIST_ID);
  });

  it('returns playlist type when both v and list are present', () => {
    assertPlaylist(p.extractId(`https://www.youtube.com/watch?v=${VIDEO_ID}&list=${PLAYLIST_ID}`), PLAYLIST_ID);
  });

  it('parses URL with query string after v parameter', () => {
    assertVideo(p.extractId(`https://www.youtube.com/watch?v=${VIDEO_ID}&t=120s`), VIDEO_ID);
  });

  it('extracts video ID from URL with extra params (m.youtube.com)', () => {
    assertVideo(p.extractId(`https://m.youtube.com/watch?v=${VIDEO_ID}&feature=shared`), VIDEO_ID);
  });

  it('returns null for empty string', () => {
    assert.strictEqual(p.extractId(''), null);
  });

  it('returns null for invalid input', () => {
    assert.strictEqual(p.extractId('not a url or id'), null);
  });

  it('returns null for YouTube URL without ID', () => {
    assert.strictEqual(p.extractId('https://youtube.com/'), null);
  });

  it('extracts playlist from music.youtube.com playlist URL', () => {
    assertPlaylist(p.extractId(`https://music.youtube.com/playlist?list=${PLAYLIST_ID}`), PLAYLIST_ID);
  });

  it('rejects IDs that are too short', () => {
    assert.strictEqual(p.extractId('abc'), null);
  });

  it('rejects IDs with special characters', () => {
    assert.strictEqual(p.extractId('invalid_id_!!!'), null);
  });
});

describe('Player Module - Queue', () => {
  let p;
  beforeEach(() => { p = setupPlayer(); });

  it('starts with an empty queue and index -1', () => {
    assert.strictEqual(p.queue.length, 0);
    assert.strictEqual(p.queueIndex, -1);
  });

  it('addToQueue pushes item and sets index for first item', () => {
    p.addToQueue('abc123', 'Video A');
    assert.strictEqual(p.queue.length, 1);
    assert.strictEqual(p.queue[0].id, 'abc123');
    assert.strictEqual(p.queue[0].title, 'Video A');
    assert.strictEqual(p.queueIndex, 0);
    assert.strictEqual(p._lastPlayed.id, 'abc123');
  });

  it('addToQueue does not auto-play second item', () => {
    p.addToQueue('abc123', 'Video A');
    p._lastPlayed = null;
    p.addToQueue('def456', 'Video B');
    assert.strictEqual(p.queue.length, 2);
    assert.strictEqual(p._lastPlayed, null);
  });

  it('addToQueue uses videoId as fallback title when title is null', () => {
    p.addToQueue('abc123');
    assert.strictEqual(p.queue[0].title, 'abc123');
  });

  it('playNext wraps to first item', () => {
    p.queue = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
    p.queueIndex = 1;
    p.playNext();
    assert.strictEqual(p.queueIndex, 0);
    assert.strictEqual(p._lastPlayed.id, 'a');
  });

  it('playPrev wraps to last item', () => {
    p.queue = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
    p.queueIndex = 0;
    p.playPrev();
    assert.strictEqual(p.queueIndex, 1);
    assert.strictEqual(p._lastPlayed.id, 'b');
  });

  it('playNext does nothing on empty queue', () => {
    p.playNext();
    assert.strictEqual(p.queueIndex, -1);
  });

  it('playIndex plays the correct item', () => {
    p.queue = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
    p.playIndex(1);
    assert.strictEqual(p.queueIndex, 1);
    assert.strictEqual(p._lastPlayed.id, 'b');
  });

  it('playIndex does nothing for out-of-range index', () => {
    p.queue = [{ id: 'a', title: 'A' }];
    p.playIndex(5);
    assert.strictEqual(p.queueIndex, -1);
  });

  it('removeFromQueue removes the correct item and updates index', () => {
    p.queue = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }];
    p.queueIndex = 1;
    p.removeFromQueue(1);
    assert.strictEqual(p.queue.length, 2);
    assert.strictEqual(p.queue[0].id, 'a');
    assert.strictEqual(p.queue[1].id, 'c');
    assert.strictEqual(p.queueIndex, 1);
  });

  it('clearQueue empties everything', () => {
    p.queue = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
    p.queueIndex = 0;
    p.clearQueue();
    assert.strictEqual(p.queue.length, 0);
    assert.strictEqual(p.queueIndex, -1);
  });

  it('playNext on single item stays at index 0', () => {
    p.queue = [{ id: 'a', title: 'A' }];
    p.queueIndex = 0;
    p.playNext();
    assert.strictEqual(p.queueIndex, 0);
  });

  it('playPrev on single item stays at index 0', () => {
    p.queue = [{ id: 'a', title: 'A' }];
    p.queueIndex = 0;
    p.playPrev();
    assert.strictEqual(p.queueIndex, 0);
  });

  it('adjusts queueIndex when removing the last item', () => {
    p.queue = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
    p.queueIndex = 1;
    p.removeFromQueue(1);
    assert.strictEqual(p.queueIndex, 0);
  });
});

describe('Player Module - History', () => {
  let p;
  beforeEach(() => { p = setupPlayer(); });

  it('starts with empty history', () => {
    assert.strictEqual(p.history.length, 0);
  });

  it('addToHistory adds to the front', () => {
    p.addToHistory('abc', 'Video A');
    assert.strictEqual(p.history[0].id, 'abc');
    p.addToHistory('def', 'Video B');
    assert.strictEqual(p.history[0].id, 'def');
    assert.strictEqual(p.history[1].id, 'abc');
  });

  it('addToHistory deduplicates by id (moves to front)', () => {
    p.addToHistory('abc', 'Video A');
    p.addToHistory('def', 'Video B');
    p.addToHistory('abc', 'Video A Updated');
    assert.strictEqual(p.history.length, 2);
    assert.strictEqual(p.history[0].id, 'abc');
    assert.strictEqual(p.history[0].title, 'Video A Updated');
  });

  it('caps history at 50 items', () => {
    for (let i = 0; i < 60; i++) {
      p.addToHistory(`vid${i}`, `Video ${i}`);
    }
    assert.strictEqual(p.history.length, 50);
  });

  it('history items have date property', () => {
    p.addToHistory('abc', 'Video A');
    assert.ok(p.history[0].date, 'history item should have a date');
  });

  it('clearHistory empties the array', async () => {
    p.addToHistory('abc', 'A');
    p.addToHistory('def', 'B');
    await p.clearHistory();
    assert.strictEqual(p.history.length, 0);
  });
});

describe('Player Module - Playlists', () => {
  let p;
  beforeEach(() => { p = setupPlayer(); });

  it('starts with empty playlists', () => {
    assert.strictEqual(p.playlists.length, 0);
  });

  it('createPlaylist adds a new playlist with given name', () => {
    const id = p.createPlaylist('Minhas Favoritas');
    assert.strictEqual(p.playlists.length, 1);
    assert.strictEqual(p.playlists[0].name, 'Minhas Favoritas');
    assert.strictEqual(p.playlists[0].videos.length, 0);
    assert.ok(id, 'should return an id');
  });

  it('createPlaylist does nothing for empty name', () => {
    p.createPlaylist('');
    assert.strictEqual(p.playlists.length, 0);
  });

  it('addToPlaylist adds a video', () => {
    p.playlists = [{ id: 'pl1', name: 'Test', videos: [] }];
    p.addToPlaylist('pl1', 'abc123', 'Video A');
    assert.strictEqual(p.playlists[0].videos.length, 1);
    assert.strictEqual(p.playlists[0].videos[0].id, 'abc123');
  });

  it('addToPlaylist rejects duplicates', () => {
    p.playlists = [{ id: 'pl1', name: 'Test', videos: [{ id: 'abc123', title: 'A' }] }];
    p.addToPlaylist('pl1', 'abc123', 'A');
    assert.strictEqual(p.playlists[0].videos.length, 1);
  });

  it('addToPlaylist does nothing for non-existent playlist', () => {
    p.playlists = [{ id: 'pl1', name: 'Test', videos: [] }];
    p.addToPlaylist('non_existent', 'abc', 'A');
    assert.strictEqual(p.playlists[0].videos.length, 0);
  });

  it('removeFromPlaylist removes a video', () => {
    p.playlists = [{
      id: 'pl1', name: 'Test',
      videos: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
    }];
    p.removeFromPlaylist('pl1', 'a');
    assert.strictEqual(p.playlists[0].videos.length, 1);
    assert.strictEqual(p.playlists[0].videos[0].id, 'b');
  });

  it('playPlaylist sets queue from playlist videos', () => {
    p.playlists = [{
      id: 'pl1', name: 'Test',
      videos: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
    }];
    p.playPlaylist('pl1');
    assert.strictEqual(p.queue.length, 2);
    assert.strictEqual(p.queueIndex, 0);
    assert.strictEqual(p._lastPlayed.id, 'a');
  });

  it('playPlaylist does nothing for empty playlist', () => {
    p.playlists = [{ id: 'pl1', name: 'Empty', videos: [] }];
    p.playPlaylist('pl1');
    assert.strictEqual(p.queue.length, 0);
  });

  it('playPlaylist does nothing for non-existent playlist', () => {
    p.queue = [];
    p.playPlaylist('non_existent');
    assert.strictEqual(p.queue.length, 0);
  });

  it('deletePlaylist removes the playlist', async () => {
    p.playlists = [
      { id: 'pl1', name: 'A', videos: [] },
      { id: 'pl2', name: 'B', videos: [] },
    ];
    await p.deletePlaylist('pl1');
    assert.strictEqual(p.playlists.length, 1);
    assert.strictEqual(p.playlists[0].id, 'pl2');
  });
});

describe('Player Module - Sound data integrity', () => {
  let p;
  before(() => { p = setupPlayer(); });

  it('has exactly 5 ambient sounds', () => {
    assert.strictEqual(p.sounds.length, 5);
  });

  it('all sounds have required properties (id, label, icon)', () => {
    for (const s of p.sounds) {
      assert.ok(s.id, `sound missing id: ${JSON.stringify(s)}`);
      assert.ok(s.label, `sound missing label: ${JSON.stringify(s)}`);
      assert.ok(s.icon, `sound missing icon: ${JSON.stringify(s)}`);
    }
  });

  it('all sound IDs are unique', () => {
    const ids = p.sounds.map(s => s.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  it('contains whitenoise, rain, ocean, wind, and brown', () => {
    const expected = ['whitenoise', 'rain', 'ocean', 'wind', 'brown'];
    for (const id of expected) {
      assert.ok(p.sounds.some(s => s.id === id), `missing sound: ${id}`);
    }
  });
});

describe('Player Module - load methods', () => {
  let p;
  beforeEach(() => { p = setupPlayer(); });

  it('loadQueue returns empty array when no saved data', () => {
    p.loadQueue();
    assert.strictEqual(p.queue.length, 0);
    assert.strictEqual(p.queueIndex, -1);
  });

  it('loadHistory returns empty array when no saved data', () => {
    p.loadHistory();
    assert.strictEqual(p.history.length, 0);
  });

  it('loadPlaylists returns empty array when no saved data', () => {
    p.loadPlaylists();
    assert.strictEqual(p.playlists.length, 0);
  });
});
