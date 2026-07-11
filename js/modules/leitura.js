const Leitura = {
  data: [],
  loading: false,

  init() {
    const section = document.getElementById('mod-leitura');
    section.innerHTML = `
      <div class="module-header">
        <h2><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> Leitura</h2>
      </div>
      <div id="leitura-input-line">
        <input id="leitura-url" class="settings-select" placeholder="Cole uma URL..." style="background-image:none">
        <button id="leitura-add-btn" class="btn-primary">ADICIONAR</button>
      </div>
      <div id="leitura-list"></div>
    `;
    this.load();
    this.render();
    document.getElementById('leitura-add-btn').addEventListener('click', () => this.add());
    document.getElementById('leitura-url').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.add();
    });
  },

  load() {
    this.data = Data.get('central_leitura') || [];
  },

  save() {
    Data.save('central_leitura', this.data);
  },

  async add() {
    const input = document.getElementById('leitura-url');
    const url = input.value.trim();
    if (!url || this.loading) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('URL inválida. Comece com http:// ou https://');
      return;
    }
    this.loading = true;
    this.render();
    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const meta = await res.json();
      this.data.unshift({
        id: Date.now().toString(36),
        url,
        title: meta.title || url,
        description: meta.description || '',
        icon: meta.icon || '',
        read: false,
        added: Date.now(),
      });
      this.save();
      input.value = '';
    } catch {
      this.data.unshift({
        id: Date.now().toString(36),
        url,
        title: url,
        description: '',
        icon: '',
        read: false,
        added: Date.now(),
      });
      this.save();
      input.value = '';
    }
    this.loading = false;
    this.render();
  },

  toggle(id) {
    const item = this.data.find(i => i.id === id);
    if (item) { item.read = !item.read; this.save(); this.render(); }
  },

  delete(id) {
    this.data = this.data.filter(i => i.id !== id);
    this.save();
    this.render();
  },

  open(id) {
    const item = this.data.find(i => i.id === id);
    if (item) window.open(item.url, '_blank');
  },

  render() {
    const container = document.getElementById('leitura-list');
    if (this.loading) {
      container.innerHTML = '<div class="leitura-loading">Buscando informações da página...</div>';
      return;
    }
    if (this.data.length === 0) {
      container.innerHTML = '<div class="leitura-empty"><div style="font-size:40px;margin-bottom:12px">📚</div><p>Nenhum link salvo</p><p style="font-size:12px;margin-top:4px">Cole uma URL acima para começar</p></div>';
      return;
    }
    container.innerHTML = this.data.map(item => `
      <div class="leitura-item ${item.read ? 'read' : ''}">
        ${item.icon ? `<img src="${item.icon}" class="leitura-icon" onerror="this.style.display='none'">` : '<div class="leitura-icon"></div>'}
        <div class="leitura-info">
          <div class="leitura-title">${item.title.replace(/</g, '&lt;')}</div>
          ${item.description ? `<div class="leitura-desc">${item.description.replace(/</g, '&lt;')}</div>` : ''}
          <div class="leitura-url-text">${item.url.replace(/</g, '&lt;')}</div>
        </div>
        <div class="leitura-actions">
          <button class="leitura-open-btn" data-id="${item.id}" title="Abrir">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="leitura-toggle-btn" data-id="${item.id}" title="${item.read ? 'Marcar não lido' : 'Marcar lido'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="leitura-del-btn" data-id="${item.id}" title="Excluir">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.leitura-open-btn').forEach(b => b.addEventListener('click', () => this.open(b.dataset.id)));
    container.querySelectorAll('.leitura-toggle-btn').forEach(b => b.addEventListener('click', () => this.toggle(b.dataset.id)));
    container.querySelectorAll('.leitura-del-btn').forEach(b => b.addEventListener('click', () => this.delete(b.dataset.id)));
    container.querySelectorAll('.leitura-info').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.closest('.leitura-item').querySelector('.leitura-open-btn')?.dataset.id;
        if (id) this.open(id);
      });
    });
  },
};
