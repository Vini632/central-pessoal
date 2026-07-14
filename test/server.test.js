const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a temp file for the test database to avoid concurrency issues
// with better-sqlite3's WAL mode when multiple test files run in parallel
const TEST_DB = path.join(os.tmpdir(), `central-test-${Date.now()}.db`);
const PORT = parseInt(process.env.TEST_PORT || '3459', 10);
const BASE = 'http://localhost:' + PORT;

function fetch(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(path, BASE);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      timeout: 5000,
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

describe('Central Pessoal Server', () => {
  let server;

  before(() => {
    // Clear the module cache so we get a fresh server (not the already-running one)
    delete require.cache[require.resolve('../server.js')];
    process.env.PORT = String(PORT);
    process.env.DB_PATH = TEST_DB;
    process.env.API_TOKEN = '';
    process.env.DISABLE_OLLAMA = '1';
    server = require('../server.js');
  });

  after(() => {
    if (server) server.close();
    // Clean up temp DB
    try { fs.unlinkSync(TEST_DB); } catch {}
  });

  it('should serve index.html', async () => {
    const res = await fetch('/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.includes('Central Pessoal'));
  });

  it('should serve CSS base', async () => {
    const res = await fetch('/css/base.css');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.includes(':root'));
  });

  it('should return 404 for unknown files', async () => {
    const res = await fetch('/nonexistent.xyz');
    assert.strictEqual(res.status, 404);
  });

  it('should return API data structure', async () => {
    const res = await fetch('/api/data');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.data);
    assert.ok(Array.isArray(json.central_notes));
    assert.ok(Array.isArray(json.central_todo));
    assert.ok(typeof json.central_settings === 'object');
    assert.strictEqual(json.central_settings.youtubeApiKey, undefined, 'youtubeApiKey must not leak to frontend');
    assert.strictEqual(json.central_settings.driveToken, undefined, 'driveToken must not leak to frontend');
  });

  it('should save and load notes', async () => {
    const testNote = [{ id: 'test-note-1', content: 'teste persistencia', date: '2024-01-01' }];
    const saveRes = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ central_notes: testNote }),
    });
    assert.strictEqual(saveRes.status, 200);

    const loadRes = await fetch('/api/data');
    const json = JSON.parse(loadRes.data);
    const found = json.central_notes.find(n => n.id === 'test-note-1');
    assert.ok(found);
    assert.strictEqual(found.content, 'teste persistencia');
  });

  it('should reject YouTube search when no key configured', async () => {
    const res = await fetch('/api/youtube/search?q=test');
    assert.strictEqual(res.status, 400);
    const json = JSON.parse(res.data);
    assert.ok(json.error);
    assert.ok(json.error.includes('API Key'));
  });

  it('should save and retrieve sensitive settings via dedicated endpoints', async () => {
    const saveRes = await fetch('/api/settings/youtubeApiKey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'test-key-123' }),
    });
    assert.strictEqual(saveRes.status, 200);

    const getRes = await fetch('/api/settings/youtubeApiKey');
    assert.strictEqual(getRes.status, 200);
    const json = JSON.parse(getRes.data);
    assert.strictEqual(json.value, 'test-key-123');
  });

  it('should reject unknown settings keys', async () => {
    const res = await fetch('/api/settings/someRandomKey');
    assert.strictEqual(res.status, 404);
  });
});
