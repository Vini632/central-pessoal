const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");

const TEST_DB = path.join(os.tmpdir(), `central-test-escrita-ai-${Date.now()}.db`);
const PORT = parseInt(process.env.TEST_PORT || "3473", 10);
const BASE = "http://localhost:" + PORT;

function fetch(pathname, opts = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(pathname, BASE);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: opts.method || "GET",
      headers: opts.headers || {},
      timeout: 15000,
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

describe("Escrita AI API", () => {
  let server;

  before(() => {
    delete require.cache[require.resolve("../server.js")];
    process.env.PORT = String(PORT);
    process.env.DB_PATH = TEST_DB;
    process.env.API_TOKEN = "";
    process.env.DISABLE_OLLAMA = "1";
    server = require("../server.js");
  });

  after(() => {
    if (server) server.close();
    try {
      fs.unlinkSync(TEST_DB);
    } catch {}
  });

  it("rejeita requisição sem prompt com 400 e mensagem específica", async () => {
    const res = await fetch("/api/escrita/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const json = JSON.parse(res.data);
    assert.strictEqual(typeof json.error, "string");
    assert.strictEqual(json.error, "prompt obrigatório");
  });

  it("rejeita método GET com 405", async () => {
    const res = await fetch("/api/escrita/ai");
    assert.strictEqual(res.status, 405);
    const json = JSON.parse(res.data);
    assert.strictEqual(json.error, "Método não permitido");
  });

  it("rejeita método PUT com 405", async () => {
    const res = await fetch("/api/escrita/ai", { method: "PUT" });
    assert.strictEqual(res.status, 405);
  });

  it("retorna 502 quando Ollama está desabilitado", async () => {
    const res = await fetch("/api/escrita/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Continue esta cena", currentText: "Era uma vez..." }),
    });
    assert.strictEqual(res.status, 502);
    const json = JSON.parse(res.data);
    assert.strictEqual(json.error, "Ollama desabilitado");
  });

  it("retorna 502 sem currentText", async () => {
    const res = await fetch("/api/escrita/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Sugira uma ideia", currentText: "" }),
    });
    assert.strictEqual(res.status, 502);
  });

  it("carrega contexto dos arquivos do livro mesmo com Ollama desabilitado", async () => {
    const res = await fetch("/api/escrita/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "teste", currentText: "" }),
    });
    assert.strictEqual(res.status, 502);
    const json = JSON.parse(res.data);
    assert.strictEqual(json.error, "Ollama desabilitado");
  });

  it("rejeita POST com body inválido com 400", async () => {
    const res = await fetch("/api/escrita/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    assert.strictEqual(res.status, 400);
  });

  it("retorna 502 com currentText não string (Ollama desabilitado vem antes da validação)", async () => {
    const res = await fetch("/api/escrita/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "teste", currentText: 123 }),
    });
    assert.strictEqual(res.status, 502);
  });
});
