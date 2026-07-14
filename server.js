const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

// Load .env if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
} catch (e) { /* .env loading failed, continue with env vars */ }

const PORT = parseInt(process.env.PORT || '3456', 10);
const API_TOKEN = process.env.API_TOKEN || '';
const OLLAMA_PORT = 11434;

// Simple auth check
function requireAuth(req, res) {
  if (!API_TOKEN) return true;
  const auth = req.headers['authorization'];
  if (auth === `Bearer ${API_TOKEN}`) return true;
  res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'Não autorizado. Configure API_TOKEN no .env' }));
  return false;
}

// Database setup
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'central.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT ''
  );
  DROP TABLE IF EXISTS events;
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT '',
    startTime TEXT NOT NULL DEFAULT '',
    endTime TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    reminder INTEGER NOT NULL DEFAULT 0,
    reminderTime TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '○',
    color TEXT NOT NULL DEFAULT '#ffffff',
    sortOrder INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS habit_logs (
    habitId TEXT NOT NULL,
    date TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (habitId, date)
  );
  CREATE TABLE IF NOT EXISTS leitura (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    read INTEGER DEFAULT 0,
    added INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

function dbAll(table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

function dbDeleteAll(table) {
  db.prepare(`DELETE FROM ${table}`).run();
}

function dbInsert(table, row) {
  const keys = Object.keys(row);
  const vals = Object.values(row);
  const placeholders = keys.map(() => '?').join(',');
  db.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`).run(...vals);
}
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

let ollamaProcess = null;
let ollamaCmd = 'ollama';
let ollamaUrl = `http://localhost:${OLLAMA_PORT}`;

// Helper: proxy request to configured Ollama URL
function ollamaProxy(path, method, body, res) {
  const urlObj = new URL(path, ollamaUrl);
  const mod = urlObj.protocol === 'https:' ? require('https') : require('http');
  const opts = {
    hostname: urlObj.hostname, port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: method || 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    timeout: 120000,
  };
  const proxy = mod.request(opts, (ollamaRes) => {
    const extra = path === '/api/generate' ? { 'Cache-Control': 'no-cache' } : {};
    res.writeHead(ollamaRes.statusCode, { 'Content-Type': 'application/x-ndjson', 'Access-Control-Allow-Origin': '*', ...extra });
    ollamaRes.pipe(res);
  });
  proxy.on('error', () => {
    if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Ollama offline' })); }
  });
  if (body) proxy.write(body);
  proxy.end();
}

function checkOllama() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${OLLAMA_PORT}/api/tags`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(true));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

let _ollamaReady = false;
let _ollamaPromise = null;

async function ensureOllama() {
  if (_ollamaReady) return true;
  if (_ollamaPromise) return _ollamaPromise; // wait for in-flight attempt
  if (process.env.DISABLE_OLLAMA) return false;
  _ollamaPromise = (async () => {
    const running = await checkOllama();
    if (running) { _ollamaReady = true; return true; }
    const started = await startOllama();
    _ollamaReady = started;
    return started;
  })();
  return _ollamaPromise;
}

function startOllama() {
  return new Promise((resolve) => {
    const possiblePaths = [
      'ollama',
      'C:\\Program Files\\Ollama\\ollama.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Ollama', 'ollama.exe'),
      path.join(process.env.USERPROFILE || '', '.ollama', 'ollama.exe'),
    ];

    for (const cmd of possiblePaths) {
      try {
        ollamaProcess = spawn(cmd, ['serve'], {
          stdio: 'ignore',
          detached: true,
          env: { ...process.env },
        });
        ollamaProcess.on('error', () => {});
        ollamaProcess.unref();
        ollamaCmd = cmd;
        break;
      } catch { continue; }
    }
    if (!ollamaProcess) { resolve(false); return; }

    // Wait for Ollama to be ready
    let attempts = 0;
    const check = setInterval(async () => {
      const ok = await checkOllama();
      if (ok) {
        clearInterval(check);
        resolve(true);
      }
      attempts++;
      if (attempts > 15) {
        clearInterval(check);
        resolve(false);
      }
    }, 1000);
  });
}

async function withOllama(req, res, handler) {
  if (process.env.DISABLE_OLLAMA) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Ollama desabilitado' }));
    return;
  }
  const ready = await ensureOllama();
  if (!ready) {
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Ollama nao disponivel' }));
    return;
  }
  handler();
}

const server = http.createServer((req, res) => {
  const url = req.url;

  // Auth check for all /api/ routes
  if (url.startsWith('/api/') && !requireAuth(req, res)) return;

  // API: Ollama status
  if (url === '/api/ollama/status') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    checkOllama().then((running) => {
      res.end(JSON.stringify({ running }));
    });
    return;
  }

  // API: Pull Ollama model
  if (url === '/api/ollama/pull' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const { model } = JSON.parse(body);
      const child = spawn(ollamaCmd, ['pull', model], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (d) => { output += d.toString(); });
      child.stderr.on('data', (d) => { output += d.toString(); });
      child.on('close', (code) => {
        res.writeHead(code === 0 ? 200 : 500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ success: code === 0, output }));
      });
    });
    return;
  }

  // API: Start Ollama
  if (url === '/api/ollama/start') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    ensureOllama().then(() => {
      res.end(JSON.stringify({ started: _ollamaReady }));
    });
    return;
  }

  // API: Set Ollama URL
  if (url === '/api/ollama/set-url' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { url: newUrl } = JSON.parse(body);
        if (newUrl) { ollamaUrl = newUrl.replace(/\/+$/, ''); }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ url: ollamaUrl }));
      } catch { res.writeHead(400); res.end('{}'); }
    });
    return;
  }

  // API: List Ollama models (uses configured ollamaUrl)
  if (url === '/api/ollama/models') {
    withOllama(req, res, () => ollamaProxy('/api/tags', 'GET', null, res));
    return;
  }

  // Proxy: Ollama generate (uses configured ollamaUrl)
  if (url === '/api/ollama/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      withOllama(req, res, () => ollamaProxy('/api/generate', 'POST', body, res));
    });
    return;
  }

  // API: Data (SQLite)
  if (url === '/api/data' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    const data = {
      central_notes: dbAll('notes'),
      central_todo: dbAll('todos'),
      central_links: dbAll('links'),
      central_events: dbAll('events'),
      central_habits: dbAll('habits'),
      central_habit_logs: dbAll('habit_logs'),
      central_leitura: dbAll('leitura'),
      central_settings: {},
    };
    const allSettings = dbAll('settings');
    for (const s of allSettings) data.central_settings[s.key] = s.value;
    // Strip sensitive keys from frontend response
    delete data.central_settings.youtubeApiKey;
    delete data.central_settings.driveToken;
    const allKv = dbAll('kv_store');
    for (const kv of allKv) {
      if (!(kv.key in data)) {
        try { data[kv.key] = JSON.parse(kv.value); } catch { data[kv.key] = kv.value; }
      }
    }
    res.end(JSON.stringify(data));
    return;
  }

  if (url === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        const tables = {
          central_notes: 'notes',
          central_todo: 'todos',
          central_links: 'links',
          central_events: 'events',
          central_habits: 'habits',
          central_habit_logs: 'habit_logs',
          central_leitura: 'leitura',
        };
        for (const [key, table] of Object.entries(tables)) {
          if (Array.isArray(input[key])) {
            dbDeleteAll(table);
            for (const row of input[key]) dbInsert(table, row);
          }
        }
        if (input.central_settings && typeof input.central_settings === 'object') {
          db.prepare('DELETE FROM settings').run();
          for (const [k, v] of Object.entries(input.central_settings)) {
            db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(k, String(v));
          }
        }
        // Save any unknown central_* keys to kv_store
        const knownTables = new Set(Object.keys(tables));
        knownTables.add('central_settings');
        for (const [key, val] of Object.entries(input)) {
          if (key.startsWith('central_') && !knownTables.has(key)) {
            if (val === null) {
              db.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
            } else {
              const value = typeof val === 'string' ? val : JSON.stringify(val);
              db.prepare('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)').run(key, value);
            }
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: Habits
  if (url === '/api/habits' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    const habits = dbAll('habits');
    const logs = dbAll('habit_logs');
    res.end(JSON.stringify({ habits, logs }));
    return;
  }

  if (url === '/api/habits' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        if (Array.isArray(input.habits)) {
          db.prepare('DELETE FROM habits').run();
          for (const h of input.habits) dbInsert('habits', h);
        }
        if (Array.isArray(input.logs)) {
          db.prepare('DELETE FROM habit_logs').run();
          for (const l of input.logs) dbInsert('habit_logs', l);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: AI Instructions file
  if (url === '/api/ai/instructions') {
    const instPath = path.join(__dirname, 'IA_INSTRUCOES.md');
    fs.readFile(instPath, 'utf8', (err, data) => {
      res.writeHead(err ? 404 : 200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ content: err ? '' : data }));
    });
    return;
  }

  // API: Web search (via DuckDuckGo, free, no key needed)
  if (url === '/api/search' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { q } = JSON.parse(body);
        if (!q) throw new Error('Query required');
        // Use DuckDuckGo Instant Answer API
        const ddgReq = https.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, (apiRes) => {
          let data = '';
          apiRes.on('data', (chunk) => { data += chunk; });
          apiRes.on('end', () => {
            try {
              const result = JSON.parse(data);
              let text = '';
              if (result.AbstractText) text += result.AbstractText + '\n';
              if (result.Results) {
                for (const r of result.Results.slice(0, 5)) {
                  if (r.Text) text += r.Text + '\n';
                }
              }
              if (!text) {
                text = result.Abstract || result.Definition || '';
              }
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ content: text.slice(0, 4000), source: 'DuckDuckGo' }));
            } catch {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ content: '', source: 'DuckDuckGo' }));
            }
          });
        });
        ddgReq.setTimeout(10000, () => { ddgReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch (e) { console.warn("server: catch", e); } });
        ddgReq.on('error', (e) => {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: Fetch URL metadata (title + description)
  if (url === '/api/metadata' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { url: targetUrl } = JSON.parse(body);
        if (!targetUrl) throw new Error('URL required');
        const metaReq = http.get(targetUrl, (targetRes) => {
          let data = '';
          targetRes.on('data', (chunk) => { data += chunk; });
          targetRes.on('end', () => {
            const title = data.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
            const desc = data.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || '';
            const icon = data.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i)?.[1] || '';
            const fullIcon = icon ? (icon.startsWith('http') ? icon : new URL(icon, targetUrl).href) : '';
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ title, description: desc, icon: fullIcon }));
          });
        });
        metaReq.setTimeout(10000, () => { metaReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch (e) { console.warn("server: catch", e); } });
        metaReq.on('error', (e) => {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: Fetch URL content
  if (url === '/api/fetch' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { url: targetUrl } = JSON.parse(body);
        if (!targetUrl) throw new Error('URL required');
        const fetchReq = http.get(targetUrl, (targetRes) => {
          let data = '';
          targetRes.on('data', (chunk) => { data += chunk; });
          targetRes.on('end', () => {
            const text = data
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 8000);
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ content: text, title: data.match(/<title>([^<]*)<\/title>/i)?.[1] || '' }));
          });
        });
        fetchReq.setTimeout(10000, () => { fetchReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch (e) { console.warn("server: catch", e); } });
        fetchReq.on('error', (e) => {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: YouTube search proxy
  if (url.startsWith('/api/youtube/search') && req.method === 'GET') {
    const q = new URL(url, 'http://localhost').searchParams.get('q');
    if (!q) { res.writeHead(400); res.end(JSON.stringify({ error: 'Query required' })); return; }
    const settings = db.prepare("SELECT value FROM settings WHERE key = 'youtubeApiKey'").get();
    const apiKey = settings?.value;
    if (!apiKey) { res.writeHead(400); res.end(JSON.stringify({ error: 'YouTube API Key nao configurada' })); return; }
    const ytReq = https.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=10&key=${apiKey}`, (ytRes) => {
      let data = '';
      ytRes.on('data', (chunk) => { data += chunk; });
      ytRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      });
    });
    ytReq.setTimeout(15000, () => { ytReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch {} });
    ytReq.on('error', (e) => { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
    return;
  }

  // API: YouTube playlist items proxy
  if (url.startsWith('/api/youtube/playlist') && req.method === 'GET') {
    const playlistId = new URL(url, 'http://localhost').searchParams.get('id');
    if (!playlistId) { res.writeHead(400); res.end(JSON.stringify({ error: 'Playlist ID required' })); return; }
    const settings = db.prepare("SELECT value FROM settings WHERE key = 'youtubeApiKey'").get();
    const apiKey = settings?.value;
    if (!apiKey) { res.writeHead(400); res.end(JSON.stringify({ error: 'YouTube API Key nao configurada' })); return; }
    const ytReq = https.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`, (ytRes) => {
      let data = '';
      ytRes.on('data', (chunk) => { data += chunk; });
      ytRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      });
    });
    ytReq.setTimeout(15000, () => { ytReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch {} });
    ytReq.on('error', (e) => { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
    return;
  }

  // API: YouTube validate key proxy
  if (url.startsWith('/api/youtube/validate') && req.method === 'GET') {
    const key = new URL(url, 'http://localhost').searchParams.get('key');
    if (!key) { res.writeHead(400); res.end(JSON.stringify({ error: 'Key required' })); return; }
    const ytReq = https.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${key}`, (ytRes) => {
      let data = '';
      ytRes.on('data', (chunk) => { data += chunk; });
      ytRes.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      });
    });
    ytReq.setTimeout(15000, () => { ytReq.destroy(); try { res.writeHead(504); res.end(JSON.stringify({ error: 'Timeout' })); } catch {} });
    ytReq.on('error', (e) => { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
    return;
  }

  // API: Sensitive settings (YouTube key, Drive token) — server-side only
  if (url.startsWith('/api/settings/') && req.method === 'GET') {
    const keyName = url.replace('/api/settings/', '');
    const allowed = ['youtubeApiKey', 'driveToken'];
    if (!allowed.includes(keyName)) { res.writeHead(404); res.end(JSON.stringify({ error: 'Unknown key' })); return; }
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(keyName);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ key: keyName, value: row?.value || '' }));
    return;
  }

  if (url.startsWith('/api/settings/') && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        const keyName = url.replace('/api/settings/', '');
        const allowed = ['youtubeApiKey', 'driveToken'];
        if (!allowed.includes(keyName)) { res.writeHead(404); res.end(JSON.stringify({ error: 'Unknown key' })); return; }
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(keyName, String(input.value));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static files
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url.split('?')[0]);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }
    if (ext === '.html') {
      data = data.toString().replace('__API_TOKEN__', API_TOKEN);
    }
    const cacheControl = ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache, no-store, must-revalidate' : 'max-age=0, must-revalidate';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cacheControl });
    res.end(data);
  });
});

// WebSocket — Terminal
const wss = new WebSocketServer({ server, path: '/terminal' });

wss.on('connection', (ws) => {
  const shell = spawn('cmd.exe', [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, TERM: 'xterm-256color' },
  });

  shell.stdout.on('data', (data) => {
    if (ws.readyState === ws.OPEN) ws.send(data.toString());
  });

  shell.stderr.on('data', (data) => {
    if (ws.readyState === ws.OPEN) ws.send(data.toString());
  });

  shell.on('close', (code) => ws.close());

  ws.on('message', (data) => {
    const msg = data.toString();
    if (msg === '__resize__') return;
    shell.stdin.write(msg);
  });

  ws.on('close', () => shell.kill());
  ws.on('error', () => shell.kill());
});

module.exports = server;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n  🖥  Central Pessoal rodando em:`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  → http://localhost:${PORT}`);
  try {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`  → http://${iface.address}:${PORT}  (LAN — ${name})`);
        }
      }
    }
  } catch (e) { console.warn("server: catch", e); }
  console.log(`  → Terminal via WebSocket ativo`);
  console.log(`  → 🗄  SQLite: ${DB_PATH}`);

  // Ollama: lazy — só verifica/inicia na primeira requisição /api/ollama/*
  if (process.env.DISABLE_OLLAMA) {
    console.log(`  → 🤖 Ollama: desabilitado`);
  } else {
    ensureOllama().then((ready) => {
      console.log(`  → 🤖 Ollama: ${ready ? 'rodando' : 'nao encontrado (lazy)'}`);
    });
  }
  console.log();
});
