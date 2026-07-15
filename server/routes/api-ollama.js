const { spawn } = require('child_process');
const { db } = require('../db');
const { ollamaProxy, withOllama, ensureOllama, checkOllama, setOllamaUrl, ollamaUrl, ollamaCmd, OLLAMA_PORT } = require('../ollama');

function handle(req, res, url) {
  // GET /api/ollama/status
  if (url === '/api/ollama/status' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    if (process.env.DISABLE_OLLAMA) {
      res.end(JSON.stringify({ running: false }));
    } else {
      checkOllama().then((running) => {
        res.end(JSON.stringify({ running }));
      });
    }
    return true;
  }

  // POST /api/ollama/pull
  if (url === '/api/ollama/pull' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const { model } = JSON.parse(body);
      const child = spawn(ollamaCmd(), ['pull', model], {
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
    return true;
  }

  // POST /api/ollama/start
  if (url === '/api/ollama/start' && req.method === 'POST') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    ensureOllama().then(() => {
      res.end(JSON.stringify({ started: true }));
    });
    return true;
  }

  // POST /api/ollama/set-url
  if (url === '/api/ollama/set-url' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { url: newUrl } = JSON.parse(body);
        setOllamaUrl(newUrl);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ url: ollamaUrl() }));
      } catch { res.writeHead(400); res.end('{}'); }
    });
    return true;
  }

  // GET /api/ollama/models
  if (url === '/api/ollama/models' && req.method === 'GET') {
    withOllama(req, res, () => ollamaProxy('/api/tags', 'GET', null, res));
    return true;
  }

  // POST /api/ollama/generate
  if (url === '/api/ollama/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      withOllama(req, res, () => ollamaProxy('/api/generate', 'POST', body, res));
    });
    return true;
  }

  return false;
}

module.exports = { handle };
