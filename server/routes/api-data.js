const { db, dbAll, dbDeleteAll, dbInsert, TABLES } = require('../db');

function handle(req, res, url) {
  if (url !== '/api/data') return false;

  // GET — return all data
  if (req.method === 'GET') {
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
    delete data.central_settings.youtubeApiKey;
    delete data.central_settings.driveToken;
    const allKv = dbAll('kv_store');
    for (const kv of allKv) {
      if (!(kv.key in data)) {
        try { data[kv.key] = JSON.parse(kv.value); } catch { data[kv.key] = kv.value; }
      }
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
    return true;
  }

  // POST — save all data
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body);
        for (const [key, table] of Object.entries(TABLES)) {
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
        const knownTables = new Set(Object.keys(TABLES));
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
    return true;
  }

  return false;
}

module.exports = { handle };
