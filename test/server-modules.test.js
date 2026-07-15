const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const os = require('os');

// Use a temp DB path that won't conflict with other test files
const TEST_DB = path.join(os.tmpdir(), `central-test-modules-${Date.now()}.db`);

describe('Server Modules', () => {
  let dbModule, mwModule;

  before(() => {
    process.env.DB_PATH = TEST_DB;
    process.env.API_TOKEN = 'test-token-456';
    process.env.DISABLE_OLLAMA = 'true';
    // Clear any cached modules
    delete require.cache[require.resolve('../server/db')];
    delete require.cache[require.resolve('../server/middleware')];
    dbModule = require('../server/db');
    mwModule = require('../server/middleware');
  });

  after(() => {
    try { require('fs').unlinkSync(TEST_DB); } catch {}
    delete process.env.DB_PATH;
  });

  describe('db.js', () => {
    it('should export db, dbAll, dbInsert, dbDeleteAll', () => {
      assert.ok(dbModule.db);
      assert.equal(typeof dbModule.dbAll, 'function');
      assert.equal(typeof dbModule.dbInsert, 'function');
      assert.equal(typeof dbModule.dbDeleteAll, 'function');
    });

    it('should export TABLES and SENSITIVE_KEYS', () => {
      assert.equal(typeof dbModule.TABLES, 'object');
      assert.ok(dbModule.TABLES.central_notes === 'notes');
      assert.ok(dbModule.TABLES.central_todo === 'todos');
      assert.ok(Array.isArray(dbModule.SENSITIVE_KEYS));
      assert.ok(dbModule.SENSITIVE_KEYS.includes('youtubeApiKey'));
      assert.ok(dbModule.SENSITIVE_KEYS.includes('driveToken'));
    });

    it('should create all expected tables', () => {
      const tables = dbModule.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
      const names = tables.map(t => t.name);
      for (const table of ['notes', 'todos', 'events', 'settings', 'habits', 'habit_logs', 'links', 'leitura', 'kv_store']) {
        assert.ok(names.includes(table), `missing table: ${table}`);
      }
    });

    it('should insert and read data', () => {
      dbModule.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('test_key', 'test_value');
      const row = dbModule.db.prepare("SELECT value FROM settings WHERE key = ?").get('test_key');
      assert.equal(row.value, 'test_value');
      dbModule.db.prepare("DELETE FROM settings WHERE key = ?").run('test_key');
    });

    it('dbAll should return all rows', () => {
      dbModule.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('all_test', 'val');
      const rows = dbModule.dbAll('settings');
      assert.ok(rows.length > 0);
      assert.ok(rows.some(r => r.key === 'all_test'));
      dbModule.db.prepare("DELETE FROM settings WHERE key = ?").run('all_test');
    });

    it('dbDeleteAll should clear a table', () => {
      dbModule.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('delete_test', 'val');
      dbModule.dbDeleteAll('settings');
      const count = dbModule.db.prepare("SELECT COUNT(*) as c FROM settings").get();
      assert.equal(count.c, 0);
      // Re-insert test setting that other tests might need
      dbModule.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run('test', 'val');
    });
  });

  describe('middleware.js', () => {
    it('should export requireAuth and checkRateLimit', () => {
      assert.equal(typeof mwModule.requireAuth, 'function');
      assert.equal(typeof mwModule.checkRateLimit, 'function');
      assert.equal(mwModule.API_TOKEN, 'test-token-456');
    });

    it('requireAuth should reject missing token', () => {
      let statusCode = 0, body = '';
      const res = { writeHead: (code) => { statusCode = code; }, end: (d) => { body = d; } };
      const req = { headers: {} };
      assert.equal(mwModule.requireAuth(req, res), false);
      assert.equal(statusCode, 401);
      assert.ok(body.includes('Não autorizado'));
    });

    it('requireAuth should accept correct token', () => {
      const res = { writeHead: () => {}, end: () => {} };
      const req = { headers: { authorization: 'Bearer test-token-456' } };
      assert.equal(mwModule.requireAuth(req, res), true);
    });

    it('checkRateLimit should pass under normal load', () => {
      const res = { writeHead: () => {}, end: () => {} };
      const req = { headers: {}, socket: { remoteAddress: '1.2.3.4' } };
      for (let i = 0; i < 5; i++) {
        assert.equal(mwModule.checkRateLimit(req, res), true);
      }
    });
  });

  describe('Route modules', () => {
    const routes = ['api-data', 'api-habits', 'api-ollama', 'api-settings', 'api-escrita', 'api-ai', 'api-youtube'];
    for (const name of routes) {
      it(`${name} should export handle function`, () => {
        const mod = require(`../server/routes/${name}`);
        assert.equal(typeof mod.handle, 'function');
      });
    }

    it('static should export handle function', () => {
      const mod = require('../server/routes/static');
      assert.equal(typeof mod.handle, 'function');
    });
  });

  describe('api-settings route', () => {
    it('should reject unknown keys with 404', () => {
      const mod = require('../server/routes/api-settings');
      let statusCode = 0, body = '';
      const res = { writeHead: (code) => { statusCode = code; }, end: (d) => { body = d; } };
      assert.equal(mod.handle({ method: 'GET' }, res, '/api/settings/unknown_key'), true);
      assert.equal(statusCode, 404);
    });

    it('should accept known keys and return value', () => {
      const mod = require('../server/routes/api-settings');
      let statusCode = 0, body = '';
      const res = { writeHead: (code, h) => { statusCode = code; }, end: (d) => { body = d; } };
      assert.equal(mod.handle({ method: 'GET' }, res, '/api/settings/youtubeApiKey'), true);
      assert.equal(statusCode, 200);
      const parsed = JSON.parse(body);
      assert.equal(parsed.key, 'youtubeApiKey');
    });
  });

  describe('api-escrita route', () => {
    it('should reject non-POST to /api/escrita/ai with 405', () => {
      const mod = require('../server/routes/api-escrita');
      let statusCode = 0;
      const res = { writeHead: (code) => { statusCode = code; }, end: () => {} };
      mod.handle({ method: 'PUT' }, res, '/api/escrita/ai');
      assert.equal(statusCode, 405);
    });

    it('should return false for non-escrita URLs', () => {
      const mod = require('../server/routes/api-escrita');
      const res = { writeHead: () => {}, end: () => {} };
      assert.equal(mod.handle({}, res, '/api/other'), false);
    });
  });

  describe('ollama.js', () => {
    it('should export helpers', () => {
      const ollama = require('../server/ollama');
      assert.equal(typeof ollama.ollamaUrl, 'function');
      assert.equal(typeof ollama.ollamaCmd, 'function');
      assert.equal(typeof ollama.ollamaProxy, 'function');
      assert.equal(typeof ollama.checkOllama, 'function');
      assert.equal(typeof ollama.ensureOllama, 'function');
      assert.equal(typeof ollama.setOllamaUrl, 'function');
      assert.equal(typeof ollama.withOllama, 'function');
      assert.equal(ollama.OLLAMA_PORT, 11434);
    });

    it('ollamaUrl should return default URL', () => {
      const ollama = require('../server/ollama');
      assert.equal(ollama.ollamaUrl(), 'http://localhost:11434');
    });

    it('setOllamaUrl should update URL', () => {
      const ollama = require('../server/ollama');
      ollama.setOllamaUrl('http://example.com:8080');
      assert.equal(ollama.ollamaUrl(), 'http://example.com:8080');
      ollama.setOllamaUrl('http://localhost:11434');
    });
  });

  describe('Middleware without API_TOKEN', () => {
    before(() => {
      delete process.env.API_TOKEN;
      delete require.cache[require.resolve('../server/middleware')];
    });

    after(() => {
      process.env.API_TOKEN = 'test-token-456';
      delete require.cache[require.resolve('../server/middleware')];
    });

    it('requireAuth should pass when no API_TOKEN set', () => {
      const mw = require('../server/middleware');
      const res = { writeHead: () => { throw new Error('should not call'); }, end: () => {} };
      const req = { headers: {} };
      assert.equal(mw.requireAuth(req, res), true);
    });
  });
});
