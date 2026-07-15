const fs = require("fs");
const path = require("path");
const http = require("http");
const { OLLAMA_PORT } = require("../ollama");

const BOOK_DIR = path.join(__dirname, "..", "..", "Castelo Aurora");
const ESC_CONTEXT_FILES = [
  "lore/mundo.md",
  "lore/castelo-aurora.md",
  "lore/sistema-escolar.md",
  "personagens/os-cinco-representantes.md",
  "personagens/protagonista.md",
  "personagens/heroina.md",
];
const ALLOWED_WRITE = ["capitulos", "cenas", "rascunhos"];

function isAllowed(p) {
  return ALLOWED_WRITE.includes(p.split(/[/\\]/)[0]);
}

function loadBookContext() {
  let ctx = "";
  for (const file of ESC_CONTEXT_FILES) {
    try {
      const content = fs.readFileSync(path.join(BOOK_DIR, file), "utf-8");
      ctx += `\n=== ${file} ===\n${content.slice(0, 3000)}\n`;
    } catch {}
  }
  return ctx;
}

function listDir(dir, relative) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const children = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = relative ? relative + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      children.push({ name: entry.name, path: relPath, type: "dir", children: listDir(fullPath, relPath) });
    } else if (entry.name.endsWith(".md")) {
      children.push({ name: entry.name, path: relPath, type: "file" });
    }
  }
  return children;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function handleAI(req, res) {
  const instrucoesPath = path.join(__dirname, "..", "..", "IA_ESCRITA_INSTRUCOES.md");
  let systemPrompt = "Você é uma assistente de escrita criativa.";
  try {
    systemPrompt = fs.readFileSync(instrucoesPath, "utf-8");
  } catch {}

  const bookContext = loadBookContext();

  readBody(req)
    .then(({ prompt, currentText }) => {
      if (!prompt) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "prompt obrigatório" }));
        return;
      }

      if (process.env.DISABLE_OLLAMA) {
        res.writeHead(502);
        res.end(JSON.stringify({ error: "Ollama desabilitado" }));
        return;
      }

      const model = process.env.ESCRITA_MODEL || process.env.OLLAMA_MODEL || "llama3:latest";
      const aiUrl = process.env.OLLAMA_URL || `http://localhost:${OLLAMA_PORT}`;

      const fullPrompt = [
        bookContext ? `## Contexto do Mundo (Castelo Aurora)\n${bookContext.slice(0, 8000)}\n` : "",
        currentText ? `## Texto atual do usuário\n${currentText.slice(-4000)}\n` : "",
        `## Instrução do usuário\n${prompt}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const payload = JSON.stringify({
        model,
        prompt: fullPrompt,
        system: systemPrompt,
        stream: false,
        options: { temperature: 0.8, num_predict: 1024 },
      });

      const options = {
        hostname: new URL(aiUrl).hostname,
        port: new URL(aiUrl).port || OLLAMA_PORT,
        path: "/api/generate",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: 8000,
      };

      const ollamaReq = http.request(options, (ollamaRes) => {
        let data = "";
        ollamaRes.on("data", (chunk) => (data += chunk));
        ollamaRes.on("end", () => {
          try {
            const result = JSON.parse(data);
            const content = result.response || "";
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ content }));
          } catch {
            res.writeHead(502);
            res.end(JSON.stringify({ error: "Resposta inválida da IA" }));
          }
        });
      });
      ollamaReq.on("error", (e) => {
        res.writeHead(502);
        res.end(JSON.stringify({ error: e.message }));
      });
      ollamaReq.setTimeout(8000, () => {
        ollamaReq.destroy();
        try {
          res.writeHead(502);
          res.end(JSON.stringify({ error: "Timeout da IA" }));
        } catch {}
      });
      ollamaReq.write(payload);
      ollamaReq.end();
    })
    .catch((e) => {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    });
}

function handleCreate(req, res) {
  readBody(req)
    .then(({ path: filePath }) => {
      if (!filePath) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "path obrigatório" }));
        return;
      }
      const first = filePath.split(/[/\\]/)[0];
      if (!ALLOWED_WRITE.includes(first)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Só é permitido criar em capitulos, cenas ou rascunhos" }));
        return;
      }
      const resolved = path.resolve(BOOK_DIR, filePath);
      if (!resolved.startsWith(BOOK_DIR)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Fora do diretório permitido" }));
        return;
      }
      if (fs.existsSync(resolved)) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: "Arquivo já existe" }));
        return;
      }
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(resolved, "", "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    })
    .catch((e) => {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    });
}

function handleRename(req, res) {
  readBody(req)
    .then(({ oldPath, newPath }) => {
      if (!oldPath || !newPath) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "oldPath e newPath obrigatórios" }));
        return;
      }
      if (!isAllowed(oldPath) || !isAllowed(newPath)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Só é permitido renomear em capitulos, cenas ou rascunhos" }));
        return;
      }
      const oldResolved = path.resolve(BOOK_DIR, oldPath);
      const newResolved = path.resolve(BOOK_DIR, newPath);
      if (!oldResolved.startsWith(BOOK_DIR) || !newResolved.startsWith(BOOK_DIR)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Fora do diretório permitido" }));
        return;
      }
      if (!fs.existsSync(oldResolved)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Arquivo não encontrado" }));
        return;
      }
      const dir = path.dirname(newResolved);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.renameSync(oldResolved, newResolved);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    })
    .catch((e) => {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    });
}

function handleDelete(req, res) {
  readBody(req)
    .then(({ path: filePath }) => {
      if (!filePath) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "path obrigatório" }));
        return;
      }
      const first = filePath.split(/[/\\]/)[0];
      if (!ALLOWED_WRITE.includes(first)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Só é permitido deletar em capitulos, cenas ou rascunhos" }));
        return;
      }
      const resolved = path.resolve(BOOK_DIR, filePath);
      if (!resolved.startsWith(BOOK_DIR)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Fora do diretório permitido" }));
        return;
      }
      if (!fs.existsSync(resolved)) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Arquivo não encontrado" }));
        return;
      }
      fs.unlinkSync(resolved);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    })
    .catch((e) => {
      res.writeHead(400);
      res.end(JSON.stringify({ error: e.message }));
    });
}

function handleTreeReadWrite(req, res, url) {
  const query = new URL(url, "http://localhost").searchParams;

  if (req.method === "GET") {
    const filePath = query.get("path");
    if (filePath) {
      const resolved = path.resolve(BOOK_DIR, filePath);
      if (!resolved.startsWith(BOOK_DIR)) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Fora do diretório permitido" }));
        return;
      }
      fs.readFile(resolved, "utf-8", (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Arquivo não encontrado" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ path: filePath, content: data }));
      });
    } else {
      try {
        const tree = { name: "Castelo Aurora", path: "", type: "dir", children: listDir(BOOK_DIR, "") };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(tree));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    }
    return;
  }

  if (req.method === "POST") {
    readBody(req)
      .then(({ path: filePath, content }) => {
        if (!filePath) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "path obrigatório" }));
          return;
        }
        const first = filePath.split(/[/\\]/)[0];
        if (!ALLOWED_WRITE.includes(first)) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Só é permitido escrever em capitulos, cenas ou rascunhos" }));
          return;
        }
        const resolved = path.resolve(BOOK_DIR, filePath);
        if (!resolved.startsWith(BOOK_DIR)) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Fora do diretório permitido" }));
          return;
        }
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(resolved, content, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      })
      .catch((e) => {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      });
    return;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: "Método não permitido" }));
}

function handle(req, res, url) {
  if (url === "/api/escrita/ai") {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "Método não permitido" }));
      return true;
    }
    handleAI(req, res);
    return true;
  }

  if (url === "/api/escrita/create" && req.method === "POST") {
    handleCreate(req, res);
    return true;
  }

  if (url === "/api/escrita/rename" && req.method === "POST") {
    handleRename(req, res);
    return true;
  }

  if (url === "/api/escrita/delete" && req.method === "POST") {
    handleDelete(req, res);
    return true;
  }

  if (url.startsWith("/api/escrita")) {
    handleTreeReadWrite(req, res, url);
    return true;
  }

  return false;
}

module.exports = { handle };
