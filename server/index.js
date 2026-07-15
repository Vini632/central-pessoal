const http = require('http');
const { requireAuth, checkRateLimit } = require('./middleware');
const apiData = require('./routes/api-data');
const apiHabits = require('./routes/api-habits');
const apiOllama = require('./routes/api-ollama');
const apiSettings = require('./routes/api-settings');
const apiEscrita = require('./routes/api-escrita');
const apiAi = require('./routes/api-ai');
const apiYoutube = require('./routes/api-youtube');
const serveStatic = require('./routes/static');
const setupTerminal = require('./ws/terminal');
const { ensureOllama } = require('./ollama');
const { DB_PATH } = require('./db');

const PORT = parseInt(process.env.PORT || '3456', 10);

const server = http.createServer((req, res) => {
  const url = req.url;

  // Auth + rate limit for all /api/ routes
  if (url.startsWith('/api/')) {
    if (!requireAuth(req, res)) return;
    if (!checkRateLimit(req, res)) return;
  }

  // Route handlers — first match wins
  if (apiOllama.handle(req, res, url)) return;
  if (apiData.handle(req, res, url)) return;
  if (apiHabits.handle(req, res, url)) return;
  if (apiAi.handle(req, res, url)) return;
  if (apiYoutube.handle(req, res, url)) return;
  if (apiSettings.handle(req, res, url)) return;
  if (apiEscrita.handle(req, res, url)) return;

  // Static files (non-API)
  serveStatic.handle(req, res, url);
});

// WebSocket
setupTerminal.setup(server);

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

  if (process.env.DISABLE_OLLAMA) {
    console.log(`  → 🤖 Ollama: desabilitado`);
  } else {
    ensureOllama().then((ready) => {
      console.log(`  → 🤖 Ollama: ${ready ? 'rodando' : 'nao encontrado (lazy)'}`);
    });
  }
  console.log();
});
