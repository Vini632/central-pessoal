const https = require("https");
const { db } = require("../db");

function search(req, res, url) {
  const q = new URL(url, "http://localhost").searchParams.get("q");
  if (!q) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Query required" }));
    return;
  }
  const settings = db.prepare("SELECT value FROM settings WHERE key = 'youtubeApiKey'").get();
  const apiKey = settings?.value;
  if (!apiKey) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "YouTube API Key nao configurada" }));
    return;
  }
  const ytReq = https.get(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=10&key=${apiKey}`,
    (ytRes) => {
      let data = "";
      ytRes.on("data", (chunk) => {
        data += chunk;
      });
      ytRes.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(data);
      });
    },
  );
  ytReq.setTimeout(15000, () => {
    ytReq.destroy();
    try {
      res.writeHead(504);
      res.end(JSON.stringify({ error: "Timeout" }));
    } catch {}
  });
  ytReq.on("error", (e) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });
}

function playlist(req, res, url) {
  const playlistId = new URL(url, "http://localhost").searchParams.get("id");
  if (!playlistId) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Playlist ID required" }));
    return;
  }
  const settings = db.prepare("SELECT value FROM settings WHERE key = 'youtubeApiKey'").get();
  const apiKey = settings?.value;
  if (!apiKey) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "YouTube API Key nao configurada" }));
    return;
  }
  const ytReq = https.get(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
    (ytRes) => {
      let data = "";
      ytRes.on("data", (chunk) => {
        data += chunk;
      });
      ytRes.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(data);
      });
    },
  );
  ytReq.setTimeout(15000, () => {
    ytReq.destroy();
    try {
      res.writeHead(504);
      res.end(JSON.stringify({ error: "Timeout" }));
    } catch {}
  });
  ytReq.on("error", (e) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });
}

function validate(req, res, url) {
  const key = new URL(url, "http://localhost").searchParams.get("key");
  if (!key) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Key required" }));
    return;
  }
  const ytReq = https.get(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${key}`,
    (ytRes) => {
      let data = "";
      ytRes.on("data", (chunk) => {
        data += chunk;
      });
      ytRes.on("end", () => {
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(data);
      });
    },
  );
  ytReq.setTimeout(15000, () => {
    ytReq.destroy();
    try {
      res.writeHead(504);
      res.end(JSON.stringify({ error: "Timeout" }));
    } catch {}
  });
  ytReq.on("error", (e) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });
}

function handle(req, res, url) {
  if (url.startsWith("/api/youtube/search") && req.method === "GET") {
    search(req, res, url);
    return true;
  }
  if (url.startsWith("/api/youtube/playlist") && req.method === "GET") {
    playlist(req, res, url);
    return true;
  }
  if (url.startsWith("/api/youtube/validate") && req.method === "GET") {
    validate(req, res, url);
    return true;
  }
  return false;
}

module.exports = { handle };
