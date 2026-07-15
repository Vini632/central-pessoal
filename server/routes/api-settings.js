const { db, SENSITIVE_KEYS } = require("../db");

function handle(req, res, url) {
  if (!url.startsWith("/api/settings/")) return false;

  const keyName = url.replace("/api/settings/", "");
  if (!SENSITIVE_KEYS.includes(keyName)) {
    res.writeHead(404, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ error: "Unknown key" }));
    return true;
  }

  if (req.method === "GET") {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(keyName);
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ key: keyName, value: row?.value || "" }));
    return true;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const input = JSON.parse(body);
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(keyName, String(input.value));
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }

  return false;
}

module.exports = { handle };
