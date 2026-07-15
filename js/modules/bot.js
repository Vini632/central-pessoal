// eslint-disable-next-line no-unused-vars
const Bot = {
  data: null,
  guilds: null,
  logs: null,
  timer: null,
  botUrl: "http://localhost:8000",

  init() {
    this.load();
    this.render();
    this.fetch();
  },

  load() {
    const saved = Data.get("central_bot_url");
    if (saved) this.botUrl = saved;
  },

  save() {
    Data.save("central_bot_url", this.botUrl);
  },

  startPolling() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.fetch(), 15000);
  },

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  async fetch() {
    if (this._fetching) return;
    this._fetching = true;
    try {
      const res = await fetch(`${this.botUrl}/api/bot/status`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      this.data = await res.json();
      // Start polling only on first successful connect
      if (!this.timer) this.startPolling();
    } catch {
      this.data = null;
      // Stop polling if bot goes offline
      this.stopPolling();
    }
    this._fetching = false;
    this.render();
  },

  async open() {
    const overlay = document.getElementById("modal-overlay");
    document.getElementById("modal-title").textContent = "Satella Bot";
    document.getElementById("modal-confirm").style.display = "none";
    document.getElementById("modal-cancel").textContent = "FECHAR";
    document.getElementById("modal-cancel").onclick = () => this.close();
    document.getElementById("modal-close").onclick = () => this.close();

    // Fetch guilds and logs
    let guildsHtml = '<div style="color:var(--text-tertiary)">Carregando...</div>';
    let logsHtml = '<div style="color:var(--text-tertiary)">Carregando...</div>';

    try {
      const [gRes, lRes] = await Promise.all([
        fetch(`${this.botUrl}/api/bot/guilds`),
        fetch(`${this.botUrl}/api/bot/logs`),
      ]);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.online && gData.guilds.length) {
          guildsHtml = gData.guilds
            .map(
              (g) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-base);border-radius:8px">
              ${g.icon ? `<img src="${g.icon}" style="width:24px;height:24px;border-radius:50%">` : `<div style="width:24px;height:24px;border-radius:50%;background:var(--border-subtle);display:flex;align-items:center;justify-content:center;font-size:10px">${g.name[0]}</div>`}
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</div>
                <div style="font-size:11px;color:var(--text-tertiary)">${g.members} membros · ID: ${g.id}</div>
              </div>
            </div>
          `,
            )
            .join("");
        } else {
          guildsHtml = '<div style="color:var(--text-tertiary);font-size:13px">Nenhum servidor</div>';
        }
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        if (lData.logs && lData.logs.length) {
          logsHtml = lData.logs
            .slice(-50)
            .reverse()
            .map((line) => {
              const isError = line.includes("ERROR") || line.includes("CRITICAL");
              const isWarn = line.includes("WARNING");
              const color = isError ? "var(--red)" : isWarn ? "var(--yellow)" : "var(--text-secondary)";
              return `<div style="font-size:11px;color:${color};padding:1px 0;font-family:var(--font-mono);white-space:pre-wrap;word-break:break-all">${line.replace(/</g, "&lt;")}</div>`;
            })
            .join("");
        } else {
          logsHtml = '<div style="color:var(--text-tertiary);font-size:13px">Nenhum log disponivel</div>';
        }
      }
    } catch {
      guildsHtml = '<div style="color:var(--red);font-size:13px">Falha ao carregar dados</div>';
      logsHtml = '<div style="color:var(--red);font-size:13px">Falha ao carregar logs</div>';
    }

    const status = this.data?.online
      ? `<span style="color:#4caf50;font-weight:600">● Online</span> <span style="color:var(--text-tertiary);font-size:12px">${this.data.latency}ms · ${this.formatUptime(this.data.uptime)}</span>`
      : '<span style="color:var(--red)">● Offline</span>';

    document.getElementById("modal-body").innerHTML = `
      <div style="margin-bottom:16px;padding:12px 14px;background:var(--bg-base);border-radius:10px;display:flex;align-items:center;gap:12px">
        <div style="font-size:32px">🤖</div>
        <div>
          <div style="font-size:15px;font-weight:600">${this.data?.online ? this.data.user : "Satella Bot"}</div>
          <div style="font-size:12px;color:var(--text-tertiary)">${status}</div>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);margin-bottom:8px">Servidores (${this.data?.guilds || 0})</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto">
          ${guildsHtml}
        </div>
      </div>

      <div>
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-tertiary);margin-bottom:8px">Logs</div>
        <div style="background:#0a0a0a;border:1px solid var(--border-subtle);border-radius:8px;padding:10px;max-height:260px;overflow-y:auto">
          ${logsHtml}
        </div>
      </div>
    `;

    overlay.classList.remove("hidden");
    overlay.onclick = (e) => {
      if (e.target === overlay) this.close();
    };
  },

  close() {
    document.getElementById("modal-overlay").classList.add("hidden");
  },

  render() {
    const container = document.getElementById("bot-container");
    if (!container) return;

    if (!this.data || !this.data.online) {
      container.innerHTML = `
        <div class="bot-offline" onclick="Bot.open()" style="cursor:pointer">
          <div class="bot-icon">🤖</div>
          <div class="bot-status">Bot offline</div>
          <div class="bot-detail">${this.data?.error || "Não foi possível conectar"}</div>
          <button class="btn-secondary" style="margin-top:12px;padding:8px 16px;font-size:11px" onclick="event.stopPropagation();Bot.reconnect()">RECONECTAR</button>
        </div>
      `;
      return;
    }

    const uptime = this.formatUptime(this.data.uptime);
    const ping = this.data.latency || 0;
    const pingColor = ping < 100 ? "var(--green)" : ping < 300 ? "var(--yellow)" : "var(--red)";

    container.innerHTML = `
      <div class="bot-online" onclick="Bot.open()" style="cursor:pointer">
        <div class="bot-header">
          <div class="bot-icon">🤖</div>
          <div>
            <div class="bot-name">${this.data.user}</div>
            <div class="bot-id">ID: ${this.data.user_id}</div>
          </div>
          <div class="bot-ping" style="color:${pingColor}">${ping}ms</div>
        </div>
        <div class="bot-stats">
          <div class="bot-stat">
            <span class="bot-stat-value">${this.data.guilds}</span>
            <span class="bot-stat-label">Servidores</span>
          </div>
          <div class="bot-stat">
            <span class="bot-stat-value">${this.data.members}</span>
            <span class="bot-stat-label">Membros</span>
          </div>
          <div class="bot-stat">
            <span class="bot-stat-value">${this.data.commands}</span>
            <span class="bot-stat-label">Comandos</span>
          </div>
        </div>
        <div class="bot-footer">
          <span class="bot-online-dot"></span>
          <span>Online</span>
          <span style="color:var(--text-tertiary)">${uptime}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--text-tertiary)">Clique para detalhes →</span>
        </div>
      </div>
    `;
  },

  formatUptime(seconds) {
    if (!seconds || seconds <= 0) return "agora mesmo";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(d + "d");
    if (h > 0) parts.push(h + "h");
    if (m > 0) parts.push(m + "m");
    return parts.join(" ") || "<1m";
  },

  reconnect() {
    this.fetch();
  },
};
