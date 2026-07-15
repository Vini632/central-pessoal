const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const OLLAMA_PORT = 11434;
let ollamaProcess = null;
let ollamaCmd = 'ollama';
let ollamaUrl = `http://localhost:${OLLAMA_PORT}`;

function ollamaProxy(reqPath, method, body, res) {
  const urlObj = new URL(reqPath, ollamaUrl);
  const mod = urlObj.protocol === 'https:' ? require('https') : require('http');
  const opts = {
    hostname: urlObj.hostname, port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: method || 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    timeout: 120000,
  };
  const proxy = mod.request(opts, (ollamaRes) => {
    const extra = reqPath === '/api/generate' ? { 'Cache-Control': 'no-cache' } : {};
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
  if (process.env.DISABLE_OLLAMA) {
    return Promise.resolve(false);
  }
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

let _ollamaReady = false;
let _ollamaPromise = null;

async function ensureOllama() {
  if (_ollamaReady) return true;
  if (_ollamaPromise) return _ollamaPromise;
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

function setOllamaUrl(url) {
  if (url) ollamaUrl = url.replace(/\/+$/, '');
}

module.exports = {
  ollamaUrl: () => ollamaUrl,
  ollamaCmd: () => ollamaCmd,
  OLLAMA_PORT,
  ollamaProxy, checkOllama, startOllama, ensureOllama, withOllama, setOllamaUrl,
};
