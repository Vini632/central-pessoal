const API_TOKEN = process.env.API_TOKEN || "";

const rateLimit = {
  window: 10000,
  maxPerWindow: 60,
  store: new Map(),
};

function checkRateLimit(req, res) {
  if (!API_TOKEN) return true;
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimit.store.get(ip) || { count: 0, reset: now + rateLimit.window };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + rateLimit.window;
  }
  entry.count++;
  rateLimit.store.set(ip, entry);
  if (rateLimit.store.size > 10000) rateLimit.store.clear();
  if (entry.count > rateLimit.maxPerWindow) {
    res.writeHead(429, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Retry-After": Math.ceil((entry.reset - now) / 1000),
    });
    res.end(JSON.stringify({ error: "Muitas requisições. Aguarde." }));
    return false;
  }
  return true;
}

function requireAuth(req, res) {
  if (!API_TOKEN) return true;
  const auth = req.headers["authorization"];
  if (auth === `Bearer ${API_TOKEN}`) return true;
  res.writeHead(401, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ error: "Não autorizado. Configure API_TOKEN no .env" }));
  return false;
}

module.exports = { checkRateLimit, requireAuth, API_TOKEN };
