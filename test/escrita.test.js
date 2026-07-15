const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TEST_DB = path.join(os.tmpdir(), `central-test-escrita-${Date.now()}.db`);
const PORT = parseInt(process.env.TEST_PORT || '3472', 10);
const BASE = 'http://localhost:' + PORT;

function fetch(pathname, opts = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(pathname, BASE);
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

describe('Escrita API', () => {
  let server;

  before(() => {
    delete require.cache[require.resolve('../server.js')];
    process.env.PORT = String(PORT);
    process.env.DB_PATH = TEST_DB;
    process.env.API_TOKEN = '';
    process.env.DISABLE_OLLAMA = '1';
    server = require('../server.js');
  });

  after(() => {
    if (server) server.close();
    try { fs.unlinkSync(TEST_DB); } catch {}
  });

  it('deve listar a árvore do diretório Castelo Aurora', async () => {
    const res = await fetch('/api/escrita');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.data);
    assert.strictEqual(json.name, 'Castelo Aurora');
    assert.strictEqual(json.type, 'dir');
    assert.ok(Array.isArray(json.children));
    const names = json.children.map(c => c.name);
    assert.ok(names.includes('lore'));
    assert.ok(names.includes('personagens'));
    assert.ok(names.includes('capitulos'));
    assert.ok(names.includes('index.md'));
  });

  it('deve ler um arquivo existente', async () => {
    const res = await fetch('/api/escrita?path=index.md');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.data);
    assert.strictEqual(json.path, 'index.md');
    assert.ok(typeof json.content === 'string');
    assert.ok(json.content.length > 0);
  });

  it('deve ler um arquivo dentro de subdiretório', async () => {
    const res = await fetch('/api/escrita?path=lore/mundo.md');
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.data);
    assert.ok(json.content.includes('10x'));
  });

  it('deve retornar 404 para arquivo inexistente', async () => {
    const res = await fetch('/api/escrita?path=inexistente.md');
    assert.strictEqual(res.status, 404);
  });

  it('deve escrever um arquivo novo', async () => {
    const res = await fetch('/api/escrita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'capitulos/capitulo-teste.md', content: '# Capítulo Teste\n\nConteúdo de teste.' }),
    });
    assert.strictEqual(res.status, 200);
    const json = JSON.parse(res.data);
    assert.strictEqual(json.ok, true);

    // Verificar que foi salvo
    const readRes = await fetch('/api/escrita?path=capitulos/capitulo-teste.md');
    assert.strictEqual(readRes.status, 200);
    const readJson = JSON.parse(readRes.data);
    assert.ok(readJson.content.includes('Capítulo Teste'));

    // Limpar
    fs.unlinkSync(path.join(__dirname, '..', 'Castelo Aurora', 'capitulos', 'capitulo-teste.md'));
  });

  it('deve rejeitar path traversal (../)', async () => {
    const res = await fetch('/api/escrita?path=../../server.js');
    assert.strictEqual(res.status, 403);

    const postRes = await fetch('/api/escrita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '../../evil.js', content: 'hack' }),
    });
    assert.strictEqual(postRes.status, 403);
  });

  it('deve rejeitar POST sem path', async () => {
    const res = await fetch('/api/escrita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'abc' }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('deve rejeitar método não permitido', async () => {
    const res = await fetch('/api/escrita', { method: 'DELETE' });
    assert.strictEqual(res.status, 405);
  });
});
