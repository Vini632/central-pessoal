const CACHE = "central-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/css/base.css",
  "/css/modules.css",
  "/css/responsive.css",
  "/js/data.js",
  "/js/voice.js",
  "/js/main.js",
  "/js/modules/settings.js",
  "/js/modules/clock.js",
  "/js/modules/news.js",
  "/js/modules/notes.js",
  "/js/modules/todo.js",
  "/js/modules/calendar.js",
  "/js/modules/pomodoro.js",
  "/js/modules/links.js",
  "/js/modules/habits.js",
  "/js/modules/terminal.js",
  "/js/modules/player.js",
  "/js/modules/ai.js",
  "/js/modules/game.js",
  "/js/modules/leitura.js",
  "/js/modules/bot.js",
  "/favicon.svg",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // API: network first, fallback to cache for GET
  if (url.pathname.startsWith("/api/")) {
    if (e.request.method === "GET") {
      e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    }
    return;
  }

  // Static assets: network first, cache as fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          return new Response("Offline", { status: 503 });
        }),
      ),
  );
});
