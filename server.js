const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const Database = require('better-sqlite3');

const PORT = parseInt(process.env.PORT || '3456', 10);
const OLLAMA_PORT = 11434;

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

const server = http.createServer((req, res) => {
  const url = req.url;

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
    startOllama().then((started) => {
      res.end(JSON.stringify({ started }));
    });
    return;
  }

  // API: List Ollama models
  if (url === '/api/ollama/models') {
    http.get(`http://localhost:${OLLAMA_PORT}/api/tags`, (ollamaRes) => {
      let data = '';
      ollamaRes.on('data', (chunk) => { data += chunk; });
      ollamaRes.on('end', () => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      });
    }).on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ollama offline', models: [] }));
    });
    return;
  }

  // Proxy: Ollama generate
  if (url === '/api/ollama/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const options = {
        hostname: 'localhost',
        port: OLLAMA_PORT,
        path: '/api/generate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      const proxy = http.request(options, (ollamaRes) => {
        res.writeHead(ollamaRes.statusCode, {
          'Content-Type': 'application/x-ndjson',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        });
        ollamaRes.pipe(res);
      });

      proxy.setTimeout(120000, () => {
        proxy.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ollama timeout após 120s' }));
      });

      proxy.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Ollama offline', detail: err.message }));
      });

      proxy.end(body);
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
      central_settings: {},
    };
    const allSettings = dbAll('settings');
    for (const s of allSettings) data.central_settings[s.key] = s.value;
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
        http.get(`http://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, (apiRes) => {
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
              // Also get web results via HTML scrape as fallback
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
        }).on('error', (e) => {
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
        http.get(targetUrl, (targetRes) => {
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
        }).on('error', (e) => {
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
        http.get(targetUrl, (targetRes) => {
          let data = '';
          targetRes.on('data', (chunk) => { data += chunk; });
          targetRes.on('end', () => {
            // Extract text content
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
        }).on('error', (e) => {
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

  // Static files
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }
    const cacheControl = ext === '.html' ? 'no-cache, no-store, must-revalidate' : 'max-age=0, must-revalidate';
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
  } catch {}
  console.log(`  → Terminal via WebSocket ativo`);
  console.log(`  → 🗄  SQLite: ${DB_PATH}`);

  // Auto-start Ollama (skip if DISABLE_OLLAMA is set, e.g. on Render)
  if (process.env.DISABLE_OLLAMA) {
    console.log(`  → 🤖 Ollama: desabilitado`);
  } else {
    const ollamaRunning = await checkOllama();
    if (ollamaRunning) {
      console.log(`  → 🤖 Ollama: rodando`);
    } else {
      console.log(`  → 🤖 Ollama: iniciando...`);
      const started = await startOllama();
      console.log(`  → 🤖 Ollama: ${started ? 'iniciado!' : 'nao encontrado'}`);
    }
  }
  console.log();
});
