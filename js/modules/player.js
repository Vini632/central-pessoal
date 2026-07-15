// eslint-disable-next-line no-unused-vars
const Player = {
  ctx: null,
  active: {},
  masterGain: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  history: [],
  playlists: [],

  sounds: [
    { id: "whitenoise", label: "Branco", icon: "▦" },
    { id: "rain", label: "Chuva", icon: "🌧" },
    { id: "ocean", label: "Oceano", icon: "🌊" },
    { id: "wind", label: "Vento", icon: "🍃" },
    { id: "brown", label: "Marrom", icon: "〰" },
  ],

  init() {
    const section = document.getElementById("mod-player");
    section.innerHTML = `
      <div class="module-header">
        <h2>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          Ambiente
        </h2>
      </div>
      <div id="player-body">
        <div id="player-grid">
          ${this.sounds
            .map(
              (s) => `
            <button class="player-btn" data-sound="${s.id}">
              <span class="player-icon">${s.icon}</span>
              <span class="player-label">${s.label}</span>
            </button>
          `,
            )
            .join("")}
        </div>
        <div id="player-volume-line">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
          <input id="player-volume" type="range" min="0" max="100" value="50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
        </div>

        <div id="yt-section">
          <div id="yt-tabs">
            <button class="yt-tab active" data-tab="player">Player</button>
            <button class="yt-tab" data-tab="search">Buscar</button>
            <button class="yt-tab" data-tab="queue">Fila</button>
            <button class="yt-tab" data-tab="history">Histórico</button>
            <button class="yt-tab" data-tab="playlists">Playlists</button>
          </div>

          <div class="yt-panel active" id="yt-panel-player">
            <div id="yt-input-line">
              <input id="yt-input" type="text" placeholder="URL do video ou playlist" spellcheck="false">
              <button id="yt-load" class="btn-primary" style="padding:10px 14px;font-size:12px">CARREGAR</button>
            </div>
            <div id="yt-player-wrap"></div>
            <div id="yt-controls">
              <button id="yt-prev" class="btn-icon" style="padding:8px"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"/></svg></button>
              <button id="yt-playpause" class="btn-icon" style="padding:8px"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
              <button id="yt-next" class="btn-icon" style="padding:8px"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"/></svg></button>
              <span id="yt-nowplaying" style="flex:1;font-size:12px;color:var(--text-tertiary);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Nenhuma musica</span>
            </div>
          </div>

          <div class="yt-panel" id="yt-panel-search">
            <div id="yt-search-line">
              <input id="yt-search-input" type="text" placeholder="Buscar musicas no YouTube..." spellcheck="false">
              <button id="yt-search-btn" class="btn-primary" style="padding:10px 14px;font-size:12px">BUSCAR</button>
            </div>
            <div id="yt-search-results"></div>
          </div>

          <div class="yt-panel" id="yt-panel-queue">
            <div id="yt-queue-list"></div>
            <div id="yt-queue-empty" style="text-align:center;padding:20px;color:var(--text-tertiary)">Fila vazia</div>
            <button id="yt-queue-clear" class="btn-secondary" style="margin-top:8px;padding:6px 12px;font-size:11px;display:none">LIMPAR FILA</button>
          </div>

          <div class="yt-panel" id="yt-panel-history">
            <div id="yt-history-list"></div>
          </div>

          <div class="yt-panel" id="yt-panel-playlists">
            <div id="yt-playlist-input-line" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
              <input id="yt-playlist-name" class="settings-select" placeholder="Nome da playlist" style="background-image:none;flex:1;min-width:120px">
              <button id="yt-playlist-create" class="btn-primary" style="padding:8px 14px;font-size:11px">CRIAR</button>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
              <input id="yt-pl-import-url" class="settings-select" placeholder="URL da playlist do YouTube" style="background-image:none;flex:2;min-width:180px;font-size:11px">
              <button id="yt-pl-import-btn" class="btn-secondary" style="padding:8px 14px;font-size:11px">IMPORTAR PLAYLIST</button>
            </div>
            <div id="yt-playlists-list"></div>
          </div>
        </div>
      </div>
    `;

    // Ambient sounds
    section.querySelectorAll(".player-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.toggle(btn.dataset.sound));
    });
    document.getElementById("player-volume").addEventListener("input", (e) => {
      if (this.masterGain) this.masterGain.gain.value = e.target.value / 100;
    });

    // Tabs
    section.querySelectorAll(".yt-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        section.querySelectorAll(".yt-tab").forEach((t) => t.classList.remove("active"));
        section.querySelectorAll(".yt-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("yt-panel-" + tab.dataset.tab).classList.add("active");
      });
    });

    // YouTube load
    document.getElementById("yt-load").addEventListener("click", () => this.loadURL());
    document.getElementById("yt-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.loadURL();
    });

    // Controls
    document.getElementById("yt-playpause").addEventListener("click", () => this.togglePlay());
    document.getElementById("yt-next").addEventListener("click", () => this.playNext());
    document.getElementById("yt-prev").addEventListener("click", () => this.playPrev());

    // Search
    document.getElementById("yt-search-btn").addEventListener("click", () => this.search());
    document.getElementById("yt-search-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.search();
    });

    this.loadQueue();
    this.renderQueue();
    this.loadHistory();
    this.renderHistory();
    this.loadPlaylists();
    this.renderPlaylists();

    document.getElementById("yt-queue-clear")?.addEventListener("click", () => this.clearQueue());
    document.getElementById("yt-playlist-create").addEventListener("click", () => this.createPlaylist());
    document.getElementById("yt-pl-import-btn").addEventListener("click", () => {
      const input = document.getElementById("yt-pl-import-url");
      const parsed = this.extractId(input.value.trim());
      if (!parsed || parsed.type !== "playlist") {
        Toast.warn("Cole uma URL de playlist do YouTube válida.");
        return;
      }
      this.importYTPlaylist(parsed.id);
    });
    document.getElementById("yt-playlist-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.createPlaylist();
    });

    document.addEventListener(
      "click",
      () => {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === "suspended") this.ctx.resume();
      },
      { once: true },
    );

    // Auto-advance YouTube player when video ends
    window.addEventListener("message", (e) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data.event === "onStateChange" && data.info === 0) {
          this.playNext();
        }
      } catch {}
    });
  },

  // ---- Ambient sounds ----
  toggle(id) {
    if (this.active[id]) this.stop(id);
    else this.start(id);
  },

  start(id) {
    if (this.active[id]) return;
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = document.getElementById("player-volume").value / 100;
      this.masterGain.connect(this.ctx.destination);
    }
    const nodes = this.createSound(id);
    if (nodes) {
      nodes.output.connect(this.masterGain);
      this.active[id] = nodes;
      document.querySelector(`[data-sound="${id}"]`)?.classList.add("active");
    }
  },

  stop(id) {
    const nodes = this.active[id];
    if (!nodes) return;
    try {
      nodes.output.disconnect();
    } catch {}
    try {
      nodes.source.stop();
    } catch {}
    delete this.active[id];
    document.querySelector(`[data-sound="${id}"]`)?.classList.remove("active");
    if (Object.keys(this.active).length === 0 && this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }
  },

  createSound(id) {
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let output = ctx.createGain();
    let source;

    switch (id) {
      case "whitenoise": {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(output);
        source.start();
        return { source, output };
      }
      case "rain": {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 800;
        bp.Q.value = 0.5;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.3;
        const lg = ctx.createGain();
        lg.gain.value = 200;
        lfo.connect(lg);
        lg.connect(bp.frequency);
        lfo.start();
        source.connect(bp);
        bp.connect(output);
        source.start();
        return { source, output };
      }
      case "ocean": {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 300;
        lp.Q.value = 0.5;
        const lfo2 = ctx.createOscillator();
        lfo2.type = "sine";
        lfo2.frequency.value = 0.08;
        const lg2 = ctx.createGain();
        lg2.gain.value = 150;
        lfo2.connect(lg2);
        lg2.connect(lp.frequency);
        lfo2.start();
        source.connect(lp);
        lp.connect(output);
        source.start();
        return { source, output };
      }
      case "wind": {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 800;
        const lfo3 = ctx.createOscillator();
        lfo3.frequency.value = 0.05;
        const lg3 = ctx.createGain();
        lg3.gain.value = 600;
        lfo3.connect(lg3);
        lg3.connect(hp.frequency);
        lfo3.start();
        source.connect(hp);
        hp.connect(output);
        source.start();
        return { source, output };
      }
      case "brown": {
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
          last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
          data[i] = last * 3;
        }
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(output);
        source.start();
        return { source, output };
      }
      default:
        return null;
    }
  },

  // ---- YouTube ----
  extractId(input) {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return { type: "video", id: input };
    try {
      const u = new URL(input);
      const host = u.hostname.replace("www.", "");
      if (host === "youtu.be") return { type: "video", id: u.pathname.slice(1).split("/")[0] };
      if (host === "youtube.com" || host === "music.youtube.com") {
        const v = u.searchParams.get("v");
        const list = u.searchParams.get("list");
        if (list) return { type: "playlist", id: list };
        if (v) return { type: "video", id: v };
      }
    } catch {}
    const m = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return { type: "video", id: m[1] };
    const pl = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (pl) return { type: "playlist", id: pl[1] };
    return null;
  },

  loadURL() {
    const input = document.getElementById("yt-input");
    const url = input.value.trim();
    if (!url) return;
    const parsed = this.extractId(url);
    if (!parsed) {
      input.value = "";
      input.placeholder = "URL invalida";
      return;
    }

    if (parsed.type === "playlist") {
      this.embedPlaylist(parsed.id);
    } else {
      this.playVideo(parsed.id);
    }
    input.value = "";
    input.placeholder = "URL do video ou playlist";
  },

  embedPlaylist(listId) {
    const wrap = document.getElementById("yt-player-wrap");
    wrap.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&rel=0"
        width="100%" height="200"
        allow="autoplay; encrypted-media"
        style="border:none"
      ></iframe>
    `;
    document.getElementById("yt-nowplaying").textContent = "Playlist carregada";
  },

  playVideo(videoId, title) {
    const wrap = document.getElementById("yt-player-wrap");
    wrap.innerHTML = `
      <iframe
        id="yt-iframe"
        src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1"
        width="100%" height="200"
        allow="autoplay; encrypted-media"
        style="border:none"
      ></iframe>
    `;
    this.isPlaying = true;
    this.updatePlayBtn();
    document.getElementById("yt-nowplaying").textContent = title || "Tocando...";
    this.addToHistory(videoId, title || videoId);
  },

  togglePlay() {
    const iframe = document.getElementById("yt-iframe");
    if (!iframe) return;
    if (this.isPlaying) {
      iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");
      this.isPlaying = false;
    } else {
      iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
      this.isPlaying = true;
    }
    this.updatePlayBtn();
  },

  updatePlayBtn() {
    const btn = document.getElementById("yt-playpause");
    if (this.isPlaying) {
      btn.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    } else {
      btn.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    }
  },

  // ---- Queue ----
  addToQueue(videoId, title) {
    this.queue.push({ id: videoId, title: title || videoId });
    if (this.queue.length === 1) this.queueIndex = 0;
    this.saveQueue();
    this.renderQueue();
    if (this.queue.length === 1) this.playVideo(videoId, title);
  },

  playIndex(i) {
    if (i < 0 || i >= this.queue.length) return;
    this.queueIndex = i;
    const item = this.queue[i];
    this.playVideo(item.id, item.title);
    this.renderQueue();
  },

  playNext() {
    if (this.queue.length === 0) return;
    this.playIndex((this.queueIndex + 1) % this.queue.length);
  },

  playPrev() {
    if (this.queue.length === 0) return;
    this.playIndex((this.queueIndex - 1 + this.queue.length) % this.queue.length);
  },

  removeFromQueue(i) {
    this.queue.splice(i, 1);
    if (this.queueIndex >= this.queue.length) this.queueIndex = this.queue.length - 1;
    this.saveQueue();
    this.renderQueue();
  },

  clearQueue() {
    this.queue = [];
    this.queueIndex = -1;
    this.saveQueue();
    this.renderQueue();
  },

  saveQueue() {
    try {
      localStorage.setItem("central_yt_queue", JSON.stringify(this.queue.slice(0, 50)));
    } catch {}
  },

  loadQueue() {
    try {
      const raw = localStorage.getItem("central_yt_queue");
      this.queue = raw ? JSON.parse(raw) : [];
      this.queueIndex = this.queue.length > 0 ? 0 : -1;
    } catch {
      this.queue = [];
    }
  },

  renderQueue() {
    const list = document.getElementById("yt-queue-list");
    const empty = document.getElementById("yt-queue-empty");
    const clearBtn = document.getElementById("yt-queue-clear");
    if (!list) return;
    if (this.queue.length === 0) {
      list.innerHTML = "";
      if (empty) empty.style.display = "block";
      if (clearBtn) clearBtn.style.display = "none";
      return;
    }
    if (empty) empty.style.display = "none";
    if (clearBtn) clearBtn.style.display = "";
    list.innerHTML = this.queue
      .map(
        (item, i) => `
      <div class="yt-queue-item ${i === this.queueIndex ? "active" : ""}" data-index="${i}">
        <span class="yt-qi-num">${i + 1}</span>
        <span class="yt-qi-title">${item.title.replace(/</g, "&lt;")}</span>
        <button class="yt-qi-del" data-index="${i}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `,
      )
      .join("");

    list.querySelectorAll(".yt-queue-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".yt-qi-del")) return;
        this.playIndex(parseInt(el.dataset.index));
      });
    });
    list.querySelectorAll(".yt-qi-del").forEach((btn) => {
      btn.addEventListener("click", () => this.removeFromQueue(parseInt(btn.dataset.index)));
    });
  },

  // ---- Search (requires API key) ----
  async search() {
    const input = document.getElementById("yt-search-input");
    const q = input.value.trim();
    if (!q) return;

    document.getElementById("yt-search-results").innerHTML = '<div class="yt-search-info">Buscando...</div>';

    try {
      const res = await apiFetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.error) {
        document.getElementById("yt-search-results").innerHTML =
          `<div class="yt-search-info">Erro: ${data.error}</div>`;
        return;
      }

      if (!data.items || data.items.length === 0) {
        document.getElementById("yt-search-results").innerHTML = '<div class="yt-search-info">Nenhum resultado</div>';
        return;
      }

      document.getElementById("yt-search-results").innerHTML = data.items
        .map(
          (item) => `
        <div class="yt-search-item" data-id="${item.id.videoId}">
          <img class="yt-si-thumb" src="${item.snippet.thumbnails.default.url}" alt="" loading="lazy">
          <div class="yt-si-info">
            <span class="yt-si-title">${item.snippet.title.replace(/</g, "&lt;")}</span>
            <span class="yt-si-channel">${item.snippet.channelTitle.replace(/</g, "&lt;")}</span>
          </div>
          <button class="yt-si-play" title="Tocar agora">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
          <button class="yt-si-queue" title="Adicionar a fila">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      `,
        )
        .join("");

      document
        .getElementById("yt-search-results")
        .querySelectorAll(".yt-search-item")
        .forEach((el) => {
          const id = el.dataset.id;
          const title = el.querySelector(".yt-si-title").textContent;
          el.querySelector(".yt-si-play").addEventListener("click", () => {
            this.playVideo(id, title);
          });
          el.querySelector(".yt-si-queue").addEventListener("click", () => {
            this.addToQueue(id, title);
          });
        });
    } catch (err) {
      document.getElementById("yt-search-results").innerHTML = `<div class="yt-search-info">Erro: ${err.message}</div>`;
    }
  },

  // ---- History ----
  addToHistory(videoId, title) {
    this.history = this.history.filter((h) => h.id !== videoId);
    this.history.unshift({ id: videoId, title: title || videoId, date: Date.now() });
    if (this.history.length > 50) this.history = this.history.slice(0, 50);
    this.saveHistory();
    this.renderHistory();
  },

  saveHistory() {
    try {
      localStorage.setItem("central_yt_history", JSON.stringify(this.history));
    } catch {}
  },

  loadHistory() {
    try {
      const raw = localStorage.getItem("central_yt_history");
      this.history = raw ? JSON.parse(raw) : [];
    } catch {
      this.history = [];
    }
  },

  async clearHistory() {
    if (!(await Modal.confirm("Limpar histórico?"))) return;
    this.history = [];
    this.saveHistory();
    this.renderHistory();
  },

  renderHistory() {
    const list = document.getElementById("yt-history-list");
    if (!list) return;
    if (this.history.length === 0) {
      list.innerHTML =
        '<div style="text-align:center;padding:30px;color:var(--text-tertiary)">Nenhum histórico ainda</div>';
      return;
    }
    list.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:11px;color:var(--text-tertiary)">${this.history.length} vídeos</span>
        <button id="yt-history-clear" class="btn-secondary" style="padding:4px 10px;font-size:10px">LIMPAR</button>
      </div>
      ${this.history
        .map(
          (item, i) => `
        <div class="yt-queue-item" data-video="${item.id}" data-title="${item.title.replace(/"/g, "&quot;")}">
          <span class="yt-qi-num">${i + 1}</span>
          <span class="yt-qi-title">${item.title.replace(/</g, "&lt;")}</span>
          <button class="yt-h-play" title="Tocar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        </div>
      `,
        )
        .join("")}
    `;
    list.querySelectorAll(".yt-queue-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".yt-h-play")) {
          this.playVideo(el.dataset.video, el.dataset.title);
          return;
        }
        this.playVideo(el.dataset.video, el.dataset.title);
      });
    });
    document.getElementById("yt-history-clear")?.addEventListener("click", () => this.clearHistory());
  },

  // ---- Playlists ----
  createPlaylist() {
    const input = document.getElementById("yt-playlist-name");
    const name = input.value.trim();
    if (!name) return;
    this.playlists.push({ id: Date.now().toString(36), name, videos: [], created: Date.now() });
    input.value = "";
    this.savePlaylists();
    this.renderPlaylists();
  },

  async deletePlaylist(id) {
    if (!(await Modal.confirm("Excluir playlist?"))) return;
    this.playlists = this.playlists.filter((p) => p.id !== id);
    this.savePlaylists();
    this.renderPlaylists();
  },

  addToPlaylist(playlistId, videoId, title) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    if (pl.videos.some((v) => v.id === videoId)) {
      Toast.warn("Já está na playlist.");
      return;
    }
    pl.videos.push({ id: videoId, title: title || videoId, added: Date.now() });
    this.savePlaylists();
    this.renderPlaylists();
  },

  removeFromPlaylist(playlistId, videoId) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    pl.videos = pl.videos.filter((v) => v.id !== videoId);
    this.savePlaylists();
    this.renderPlaylists();
  },

  playPlaylist(playlistId) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl || pl.videos.length === 0) return;
    this.queue = pl.videos.map((v) => ({ id: v.id, title: v.title }));
    this.queueIndex = 0;
    this.saveQueue();
    this.renderQueue();
    this.playVideo(this.queue[0].id, this.queue[0].title);
    // Switch to queue tab
    const tab = document.querySelector('.yt-tab[data-tab="queue"]');
    if (tab) tab.click();
  },

  savePlaylists() {
    try {
      localStorage.setItem("central_yt_playlists", JSON.stringify(this.playlists));
    } catch {}
  },

  loadPlaylists() {
    try {
      const raw = localStorage.getItem("central_yt_playlists");
      this.playlists = raw ? JSON.parse(raw) : [];
    } catch {
      this.playlists = [];
    }
  },

  async importYTPlaylist(playlistId) {
    if (!this.playlists.length) {
      Toast.warn("Crie uma playlist primeiro.");
      return;
    }
    const list = this.playlists.map((p, i) => `${i + 1}. ${p.name} (${p.videos.length} vídeos)`).join("\n");
    const plName = await Modal.prompt(`Qual playlist adicionar os vídeos?\n\n${list}\n\nDigite o número:`);
    if (!plName) return;
    const idx = parseInt(plName) - 1;
    if (isNaN(idx) || idx < 0 || idx >= this.playlists.length) {
      Toast.warn("Número inválido.");
      return;
    }
    const target = this.playlists[idx];
    try {
      const res = await apiFetch(`/api/youtube/playlist?id=${playlistId}`);
      const data = await res.json();
      if (data.error) {
        Toast.error("Erro: " + data.error);
        return;
      }
      if (!data.items || data.items.length === 0) {
        Toast.info("Nenhum vídeo encontrado na playlist.");
        return;
      }
      let added = 0;
      for (const item of data.items) {
        const vid = item.snippet.resourceId.videoId;
        const title = item.snippet.title;
        if (!target.videos.some((v) => v.id === vid)) {
          target.videos.push({ id: vid, title: title || vid, added: Date.now() });
          added++;
        }
      }
      this.savePlaylists();
      this.renderPlaylists();
      Toast.success(`✅ ${added} vídeos importados para "${target.name}"!`);
    } catch (e) {
      Toast.error("Erro ao importar: " + e.message);
    }
  },

  renderPlaylists() {
    const list = document.getElementById("yt-playlists-list");
    if (!list) return;
    if (this.playlists.length === 0) {
      list.innerHTML =
        '<div style="text-align:center;padding:30px;color:var(--text-tertiary)">Nenhuma playlist criada</div>';
      return;
    }
    list.innerHTML = this.playlists
      .map(
        (pl) => `
      <div class="yt-playlist-card">
        <div class="yt-pl-header">
          <span class="yt-pl-name">${pl.name.replace(/</g, "&lt;")}</span>
          <span class="yt-pl-count">${pl.videos.length} vídeos</span>
        </div>
        ${
          pl.videos.length > 0
            ? `
          <div class="yt-pl-videos">
            ${pl.videos
              .slice(0, 5)
              .map(
                (v) => `
              <div class="yt-pl-video">
                <span class="yt-pl-v-title">${v.title.replace(/</g, "&lt;")}</span>
                <button class="yt-pl-v-del" data-playlist="${pl.id}" data-video="${v.id}" title="Remover">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            `,
              )
              .join("")}
            ${pl.videos.length > 5 ? `<div style="font-size:10px;color:var(--text-muted);padding:4px 0">+${pl.videos.length - 5} mais</div>` : ""}
          </div>
        `
            : '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">Vazia</div>'
        }
        <div class="yt-pl-actions">
          <button class="yt-pl-play btn-secondary" data-playlist="${pl.id}" style="padding:4px 10px;font-size:10px">▶ TOCAR</button>
          <button class="yt-pl-add-from-search btn-secondary" data-playlist="${pl.id}" style="padding:4px 10px;font-size:10px">+ ADICIONAR</button>
          <button class="yt-pl-del btn-danger" data-playlist="${pl.id}" style="padding:4px 10px;font-size:10px">EXCLUIR</button>
        </div>
      </div>
    `,
      )
      .join("");

    list
      .querySelectorAll(".yt-pl-play")
      .forEach((b) => b.addEventListener("click", () => this.playPlaylist(b.dataset.playlist)));
    list
      .querySelectorAll(".yt-pl-del")
      .forEach((b) => b.addEventListener("click", () => this.deletePlaylist(b.dataset.playlist)));
    list.querySelectorAll(".yt-pl-v-del").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeFromPlaylist(b.dataset.playlist, b.dataset.video);
      }),
    );
    list.querySelectorAll(".yt-pl-add-from-search").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.dataset.playlist;
        const results = document.querySelectorAll(".yt-search-item");
        if (!results.length) {
          Toast.warn("Faça uma busca primeiro e clique em + ao lado dos resultados.");
          return;
        }
        results.forEach((el) => {
          const exist = el.querySelector(".yt-si-pl-add");
          if (!exist) {
            const btn = document.createElement("button");
            btn.className = "yt-si-pl-add";
            btn.title = "Adicionar à playlist";
            btn.innerHTML =
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
            btn.style.cssText = "background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px";
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              this.addToPlaylist(id, el.dataset.id, el.querySelector(".yt-si-title")?.textContent || el.dataset.id);
            });
            el.querySelector(".yt-si-queue")?.after(btn);
          }
        });
        // Switch to search tab
        const tab = document.querySelector('.yt-tab[data-tab="search"]');
        if (tab) tab.click();
      });
    });
  },
};
