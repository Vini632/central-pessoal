const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const os = require("os");

const TEST_DB = path.join(os.tmpdir(), `central-test-modules-${Date.now()}.db`);

describe("Server Modules", () => {
  let dbModule, mwModule;

  before(() => {
    process.env.DB_PATH = TEST_DB;
    process.env.API_TOKEN = "test-token-456";
    process.env.DISABLE_OLLAMA = "true";
    delete require.cache[require.resolve("../server/db")];
    delete require.cache[require.resolve("../server/middleware")];
    dbModule = require("../server/db");
    mwModule = require("../server/middleware");
  });

  after(() => {
    try {
      require("fs").unlinkSync(TEST_DB);
    } catch {}
    delete process.env.DB_PATH;
  });

  describe("db.js", () => {
    it("should export db instance with prepare and exec", () => {
      assert.strictEqual(typeof dbModule.db, "object");
      assert.strictEqual(typeof dbModule.db.prepare, "function");
      assert.strictEqual(typeof dbModule.db.exec, "function");
      assert.strictEqual(typeof dbModule.dbAll, "function");
      assert.strictEqual(typeof dbModule.dbInsert, "function");
      assert.strictEqual(typeof dbModule.dbDeleteAll, "function");
    });

    it("should export TABLES map and SENSITIVE_KEYS", () => {
      assert.strictEqual(typeof dbModule.TABLES, "object");
      assert.strictEqual(dbModule.TABLES.central_notes, "notes");
      assert.strictEqual(dbModule.TABLES.central_todo, "todos");
      assert.strictEqual(dbModule.TABLES.central_links, "links");
      assert.strictEqual(dbModule.TABLES.central_events, "events");
      assert.strictEqual(dbModule.TABLES.central_habits, "habits");
      assert.strictEqual(dbModule.TABLES.central_habit_logs, "habit_logs");
      assert.strictEqual(dbModule.TABLES.central_leitura, "leitura");
      assert.ok(Array.isArray(dbModule.SENSITIVE_KEYS));
      assert.strictEqual(dbModule.SENSITIVE_KEYS.length, 2);
      assert.strictEqual(dbModule.SENSITIVE_KEYS[0], "youtubeApiKey");
      assert.strictEqual(dbModule.SENSITIVE_KEYS[1], "driveToken");
    });

    it("should create all 9 expected tables", () => {
      const tables = dbModule.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
      const names = tables.map((t) => t.name);
      const expected = ["events", "habit_logs", "habits", "kv_store", "leitura", "links", "notes", "settings", "todos"];
      assert.strictEqual(names.length, expected.length);
      for (let i = 0; i < expected.length; i++) {
        assert.strictEqual(
          names[i],
          expected[i],
          `table mismatch at index ${i}: expected ${expected[i]}, got ${names[i]}`,
        );
      }
    });

    it("should insert and read data", () => {
      const insert = dbModule.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
      insert.run("test_key", "test_value");
      const row = dbModule.db.prepare("SELECT value FROM settings WHERE key = ?").get("test_key");
      assert.strictEqual(row.value, "test_value");
      dbModule.db.prepare("DELETE FROM settings WHERE key = ?").run("test_key");
      const after = dbModule.db.prepare("SELECT COUNT(*) as c FROM settings WHERE key = ?").get("test_key");
      assert.strictEqual(after.c, 0);
    });

    it("dbAll should return all rows", () => {
      dbModule.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("all_test", "val");
      const rows = dbModule.dbAll("settings");
      const found = rows.filter((r) => r.key === "all_test");
      assert.strictEqual(found.length, 1);
      assert.strictEqual(found[0].value, "val");
      dbModule.db.prepare("DELETE FROM settings WHERE key = ?").run("all_test");
    });

    it("dbDeleteAll should clear a table", () => {
      dbModule.db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("delete_test", "val");
      dbModule.dbDeleteAll("settings");
      const count = dbModule.db.prepare("SELECT COUNT(*) as c FROM settings").get();
      assert.strictEqual(count.c, 0);
    });

    it("dbInsert should upsert on duplicate key", () => {
      dbModule.dbInsert("settings", { key: "upsert_test", value: "first" });
      const first = dbModule.db.prepare("SELECT value FROM settings WHERE key = ?").get("upsert_test");
      assert.strictEqual(first.value, "first");
      dbModule.dbInsert("settings", { key: "upsert_test", value: "second" });
      const second = dbModule.db.prepare("SELECT value FROM settings WHERE key = ?").get("upsert_test");
      assert.strictEqual(second.value, "second");
      dbModule.db.prepare("DELETE FROM settings WHERE key = ?").run("upsert_test");
    });

    it("dbAll with empty table should return empty array", () => {
      dbModule.dbDeleteAll("settings");
      const rows = dbModule.dbAll("settings");
      assert.strictEqual(rows.length, 0);
      assert.ok(Array.isArray(rows));
    });
  });

  describe("middleware.js", () => {
    it("should export requireAuth and checkRateLimit with correct token", () => {
      assert.strictEqual(typeof mwModule.requireAuth, "function");
      assert.strictEqual(typeof mwModule.checkRateLimit, "function");
      assert.strictEqual(mwModule.API_TOKEN, "test-token-456");
    });

    it("requireAuth should reject missing token with 401 and error message", () => {
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code, _h) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      const req = { headers: {} };
      assert.strictEqual(mwModule.requireAuth(req, res), false);
      assert.strictEqual(statusCode, 401);
      const parsed = JSON.parse(body);
      assert.strictEqual(parsed.error, "Não autorizado. Configure API_TOKEN no .env");
    });

    it("requireAuth should reject malformed Authorization header", () => {
      let statusCode = 0;
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: () => {},
      };
      const req = { headers: { authorization: "Basic xxx" } };
      assert.strictEqual(mwModule.requireAuth(req, res), false);
      assert.strictEqual(statusCode, 401);
    });

    it("requireAuth should reject wrong token", () => {
      let statusCode = 0;
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: () => {},
      };
      const req = { headers: { authorization: "Bearer wrong-token" } };
      assert.strictEqual(mwModule.requireAuth(req, res), false);
      assert.strictEqual(statusCode, 401);
    });

    it("requireAuth should accept correct token", () => {
      const res = {
        writeHead: () => {
          throw new Error("should not call");
        },
        end: () => {},
      };
      const req = { headers: { authorization: "Bearer test-token-456" } };
      assert.strictEqual(mwModule.requireAuth(req, res), true);
    });

    it("checkRateLimit should pass under normal load", () => {
      const res = {
        writeHead: () => {
          throw new Error("should not rate limit");
        },
        end: () => {},
      };
      const req = { headers: {}, socket: { remoteAddress: "1.2.3.4" } };
      for (let i = 0; i < 5; i++) {
        assert.strictEqual(mwModule.checkRateLimit(req, res), true);
      }
    });

    it("checkRateLimit should block when exceeded", () => {
      // Rate limit is 60 per 10s window. We'll hit 61 from a unique IP
      let blocked = false;
      const res = {
        writeHead: (code, _h) => {
          blocked = true;
          assert.strictEqual(code, 429);
        },
        end: (d) => {
          const parsed = JSON.parse(d);
          assert.strictEqual(parsed.error, "Muitas requisições. Aguarde.");
        },
      };
      const req = { headers: {}, socket: { remoteAddress: "99.99.99.99" } };
      for (let i = 0; i < 61; i++) {
        mwModule.checkRateLimit(req, res);
      }
      assert.strictEqual(blocked, true);
    });

    it("checkRateLimit should pass when no API_TOKEN (dev mode)", () => {
      delete require.cache[require.resolve("../server/middleware")];
      const oldToken = process.env.API_TOKEN;
      delete process.env.API_TOKEN;
      const mw = require("../server/middleware");
      const res = {
        writeHead: () => {
          throw new Error("should not call");
        },
        end: () => {},
      };
      const req = { headers: {}, socket: { remoteAddress: "1.2.3.4" } };
      for (let i = 0; i < 100; i++) {
        assert.strictEqual(mw.checkRateLimit(req, res), true);
      }
      process.env.API_TOKEN = oldToken;
      delete require.cache[require.resolve("../server/middleware")];
    });
  });

  describe("Route modules", () => {
    const routeFiles = {
      "api-data": "../server/routes/api-data",
      "api-habits": "../server/routes/api-habits",
      "api-ollama": "../server/routes/api-ollama",
      "api-settings": "../server/routes/api-settings",
      "api-escrita": "../server/routes/api-escrita",
      "api-ai": "../server/routes/api-ai",
      "api-youtube": "../server/routes/api-youtube",
      static: "../server/routes/static",
    };

    for (const [name, modPath] of Object.entries(routeFiles)) {
      it(`${name} should export handle function`, () => {
        const mod = require(modPath);
        assert.strictEqual(typeof mod.handle, "function");
      });
    }

    it("route handlers should return false for unmatched routes", () => {
      for (const modPath of Object.values(routeFiles)) {
        // static route is a catch-all, skips this test
        if (modPath === "../server/routes/static") continue;
        const mod = require(modPath);
        const res = { writeHead: () => {}, end: () => {} };
        const result = mod.handle({ method: "GET" }, res, "/nonexistent/route");
        assert.strictEqual(result, false);
      }
    });
  });

  describe("api-data route", () => {
    it("GET should return all data as JSON with correct structure", () => {
      const mod = require("../server/routes/api-data");
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code, _h) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/data"), true);
      assert.strictEqual(statusCode, 200);
      const parsed = JSON.parse(body);
      assert.ok(Array.isArray(parsed.central_notes));
      assert.ok(Array.isArray(parsed.central_todo));
      assert.ok(Array.isArray(parsed.central_links));
      assert.ok(Array.isArray(parsed.central_events));
      assert.ok(Array.isArray(parsed.central_habits));
      assert.ok(Array.isArray(parsed.central_habit_logs));
      assert.ok(Array.isArray(parsed.central_leitura));
      assert.strictEqual(typeof parsed.central_settings, "object");
      assert.strictEqual(parsed.central_settings.youtubeApiKey, undefined);
      assert.strictEqual(parsed.central_settings.driveToken, undefined);
    });

    it("POST should reject invalid JSON with 400", () => {
      const mod = require("../server/routes/api-data");
      let statusCode = 0,
        _body = "";
      const req = {
        method: "POST",
        on: (evt, cb) => {
          if (evt === "data") cb("not valid json");
          if (evt === "end") cb();
        },
      };
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: (d) => {
          _body = d;
        },
      };
      assert.strictEqual(mod.handle(req, res, "/api/data"), true);
      assert.strictEqual(statusCode, 400);
    });

    it("should reject non-GET/POST methods", () => {
      const mod = require("../server/routes/api-data");
      let called = false;
      const res = {
        writeHead: () => {
          called = true;
        },
        end: () => {},
      };
      assert.strictEqual(mod.handle({ method: "DELETE" }, res, "/api/data"), false);
      assert.strictEqual(called, false);
    });
  });

  describe("api-habits route", () => {
    it("GET should return habits and logs arrays", () => {
      const mod = require("../server/routes/api-habits");
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code, _h) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/habits"), true);
      assert.strictEqual(statusCode, 200);
      const parsed = JSON.parse(body);
      assert.ok(Array.isArray(parsed.habits));
      assert.ok(Array.isArray(parsed.logs));
    });

    it("should reject non-GET/POST methods", () => {
      const mod = require("../server/routes/api-habits");
      const res = { writeHead: () => {}, end: () => {} };
      assert.strictEqual(mod.handle({ method: "DELETE" }, res, "/api/habits"), false);
    });
  });

  describe("api-ollama route", () => {
    it("GET /api/ollama/status should return running status", (_t) => {
      const mod = require("../server/routes/api-ollama");
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/ollama/status"), true);
      assert.strictEqual(statusCode, 200);
      return new Promise((resolve) => {
        const _origEnd = res.end;
        res.end = (d) => {
          body = d;
          resolve();
        };
        // already called by the handler, trigger manually
        if (body) resolve();
        setTimeout(resolve, 50);
      }).then(() => {
        const parsed = JSON.parse(body);
        assert.strictEqual(typeof parsed.running, "boolean");
      });
    });

    it("POST /api/ollama/start should return started flag", () => {
      const mod = require("../server/routes/api-ollama");
      let statusCode = 0,
        _body = "";
      const res = {
        writeHead: (code, _h) => {
          statusCode = code;
        },
        end: (d) => {
          _body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "POST" }, res, "/api/ollama/start"), true);
      assert.strictEqual(statusCode, 200);
    });
  });

  describe("api-ai route", () => {
    it("GET /api/ai/instructions should return content string", (_t) => {
      const mod = require("../server/routes/api-ai");
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/ai/instructions"), true);
      return new Promise((resolve) => {
        const _origEnd = res.end;
        res.end = (d) => {
          body = d;
          resolve();
        };
        if (body) resolve();
        setTimeout(resolve, 100);
      }).then(() => {
        assert.strictEqual(statusCode, 200);
        const parsed = JSON.parse(body);
        assert.strictEqual(typeof parsed.content, "string");
      });
    });
  });

  describe("api-youtube route", () => {
    it("GET /api/youtube/search should return 400 when no query", () => {
      const mod = require("../server/routes/api-youtube");
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/youtube/search"), true);
      assert.strictEqual(statusCode, 400);
      const parsed = JSON.parse(body);
      assert.strictEqual(parsed.error, "Query required");
    });

    it("GET /api/youtube/validate should return 400 when no key", () => {
      const mod = require("../server/routes/api-youtube");
      let statusCode = 0,
        _body = "";
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: (d) => {
          _body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/youtube/validate"), true);
      assert.strictEqual(statusCode, 400);
    });
  });

  describe("static route", () => {
    it("should serve index.html for /", (_t) => {
      const mod = require("../server/routes/static");
      let statusCode = 0,
        data = "";
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: (d) => {
          data = d;
        },
      };
      mod.handle({}, res, "/");
      return new Promise((resolve) => {
        const _origEnd = res.end;
        res.end = (d) => {
          data = d;
          resolve();
        };
        if (data) resolve();
        setTimeout(resolve, 100);
      }).then(() => {
        assert.strictEqual(statusCode, 200);
        assert.match(data.toString(), /<html/);
      });
    });

    it("should return 404 for nonexistent files", (_t) => {
      const mod = require("../server/routes/static");
      let statusCode = 0;
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: () => {},
      };
      mod.handle({}, res, "/nonexistent-file-12345.css");
      return new Promise((resolve) => {
        const _origEnd = res.end;
        res.end = () => {
          resolve();
        };
        setTimeout(resolve, 100);
      }).then(() => {
        assert.strictEqual(statusCode, 404);
      });
    });

    it("should return 403 for path traversal attempts", () => {
      const mod = require("../server/routes/static");
      let statusCode = 0;
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: () => {},
      };
      mod.handle({}, res, "/../server.js");
      assert.strictEqual(statusCode, 403);
    });
  });

  describe("api-settings route", () => {
    it("should reject unknown keys with 404 and error message", () => {
      const mod = require("../server/routes/api-settings");
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/settings/unknown_key"), true);
      assert.strictEqual(statusCode, 404);
      const parsed = JSON.parse(body);
      assert.strictEqual(parsed.error, "Unknown key");
    });

    it("should accept known keys and return value", () => {
      const mod = require("../server/routes/api-settings");
      let statusCode = 0,
        body = "";
      const res = {
        writeHead: (code, _h) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle({ method: "GET" }, res, "/api/settings/youtubeApiKey"), true);
      assert.strictEqual(statusCode, 200);
      const parsed = JSON.parse(body);
      assert.strictEqual(parsed.key, "youtubeApiKey");
      assert.strictEqual(typeof parsed.value, "string");
    });

    it("POST should save and return ok", () => {
      const mod = require("../server/routes/api-settings");
      let statusCode = 0,
        body = "";
      const req = {
        method: "POST",
        on: (evt, cb) => {
          if (evt === "data") cb(JSON.stringify({ value: "new-test-key-value" }));
          if (evt === "end") cb();
        },
      };
      const res = {
        writeHead: (code, _h) => {
          statusCode = code;
        },
        end: (d) => {
          body = d;
        },
      };
      assert.strictEqual(mod.handle(req, res, "/api/settings/youtubeApiKey"), true);
      assert.strictEqual(statusCode, 200);
      assert.strictEqual(JSON.parse(body).ok, true);
    });
  });

  describe("api-escrita route", () => {
    it("should reject non-POST to /api/escrita/ai with 405", () => {
      const mod = require("../server/routes/api-escrita");
      let statusCode = 0;
      const res = {
        writeHead: (code) => {
          statusCode = code;
        },
        end: () => {},
      };
      mod.handle({ method: "PUT" }, res, "/api/escrita/ai");
      assert.strictEqual(statusCode, 405);
    });

    it("should return false for non-escrita URLs", () => {
      const mod = require("../server/routes/api-escrita");
      const res = { writeHead: () => {}, end: () => {} };
      assert.strictEqual(mod.handle({}, res, "/api/other"), false);
    });
  });

  describe("ollama.js", () => {
    it("should export all helpers", () => {
      const ollama = require("../server/ollama");
      assert.strictEqual(typeof ollama.ollamaUrl, "function");
      assert.strictEqual(typeof ollama.ollamaCmd, "function");
      assert.strictEqual(typeof ollama.ollamaProxy, "function");
      assert.strictEqual(typeof ollama.checkOllama, "function");
      assert.strictEqual(typeof ollama.ensureOllama, "function");
      assert.strictEqual(typeof ollama.setOllamaUrl, "function");
      assert.strictEqual(typeof ollama.withOllama, "function");
      assert.strictEqual(ollama.OLLAMA_PORT, 11434);
    });

    it("ollamaUrl should return default URL", () => {
      const ollama = require("../server/ollama");
      assert.strictEqual(ollama.ollamaUrl(), "http://localhost:11434");
    });

    it("setOllamaUrl should update and return new URL", () => {
      const ollama = require("../server/ollama");
      ollama.setOllamaUrl("http://example.com:8080");
      assert.strictEqual(ollama.ollamaUrl(), "http://example.com:8080");
      ollama.setOllamaUrl("http://localhost:11434");
      assert.strictEqual(ollama.ollamaUrl(), "http://localhost:11434");
    });

    it("setOllamaUrl should strip trailing slash", () => {
      const ollama = require("../server/ollama");
      ollama.setOllamaUrl("http://example.com:8080/");
      assert.strictEqual(ollama.ollamaUrl(), "http://example.com:8080");
      ollama.setOllamaUrl("http://localhost:11434");
    });

    it("checkOllama should return boolean", async () => {
      const ollama = require("../server/ollama");
      const result = await ollama.checkOllama();
      assert.strictEqual(typeof result, "boolean");
    });
  });

  describe("Middleware without API_TOKEN", () => {
    before(() => {
      delete process.env.API_TOKEN;
      delete require.cache[require.resolve("../server/middleware")];
    });

    after(() => {
      process.env.API_TOKEN = "test-token-456";
      delete require.cache[require.resolve("../server/middleware")];
    });

    it("requireAuth should pass when no API_TOKEN (dev mode)", () => {
      const mw = require("../server/middleware");
      let writeHeadCalled = false;
      const res = {
        writeHead: () => {
          writeHeadCalled = true;
        },
        end: () => {},
      };
      const req = { headers: {} };
      assert.strictEqual(mw.requireAuth(req, res), true);
      assert.strictEqual(writeHeadCalled, false);
      assert.strictEqual(mw.API_TOKEN, "");
    });
  });
});
