const { db, dbAll, dbInsert } = require("../db");

function handle(req, res, url) {
  if (url !== "/api/habits") return false;

  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    const habits = dbAll("habits");
    const logs = dbAll("habit_logs");
    res.end(JSON.stringify({ habits, logs }));
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
        if (Array.isArray(input.habits)) {
          db.prepare("DELETE FROM habits").run();
          for (const h of input.habits) dbInsert("habits", h);
        }
        if (Array.isArray(input.logs)) {
          db.prepare("DELETE FROM habit_logs").run();
          for (const l of input.logs) dbInsert("habit_logs", l);
        }
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
