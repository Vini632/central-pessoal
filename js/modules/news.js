// eslint-disable-next-line no-unused-vars
const News = {
  sources: [
    { name: "Tech Crunch", url: "https://techcrunch.com/feed/" },
    { name: "Hacker News", url: "https://hnrss.org/frontpage" },
    { name: "G1", url: "https://g1.globo.com/rss/g1/" },
    { name: "UOL", url: "https://rss.uol.com.br/" },
    { name: "Canaltech", url: "https://canaltech.com.br/rss/" },
  ],

  async init() {
    document.getElementById("news-refresh").addEventListener("click", () => this.fetch());
    this.setupSatellite();
    this.fetch();
  },

  setupSatellite() {
    const btn = document.getElementById("satellite-toggle");
    const embed = document.getElementById("satellite-embed");
    if (!btn || !embed) return;
    btn.addEventListener("click", () => {
      const open = embed.style.display === "block";
      embed.style.display = open ? "none" : "block";
      btn.textContent = open ? "🛰️ VER SATÉLITES AO VIVO" : "🛰️ FECHAR SATÉLITES";
    });
  },

  async fetch() {
    const container = document.getElementById("news-list");
    const loading = document.getElementById("news-loading");
    loading.textContent = "Carregando notícias...";
    loading.style.display = "block";
    container.innerHTML = "";

    const allItems = [];

    for (const source of this.sources) {
      try {
        const items = await this.fetchFeed(source);
        allItems.push(...items);
      } catch {
        continue;
      }
    }

    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const top = allItems.slice(0, 20);

    loading.style.display = "none";

    if (top.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-secondary)">Nenhuma notícia encontrada</div>';
      return;
    }

    top.forEach((item) => {
      const card = document.createElement("div");
      card.className = "news-card";
      card.innerHTML = `
        <div class="news-title"><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></div>
        <div class="news-meta">
          <span>${item.source}</span>
          <span>${this.formatDate(item.pubDate)}</span>
        </div>
      `;
      container.appendChild(card);
    });
  },

  async fetchFeed(source) {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`);
    const data = await res.json();

    if (data.status !== "ok") return [];

    return data.items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: source.name,
    }));
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  },
};
