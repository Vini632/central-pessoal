const Settings = {
  defaults: {
    aiModel: '',
    weatherCity: '',
    youtubeApiKey: '',
    theme: 'monochrome',
    driveClientId: '',
    driveToken: '',
    ollamaUrl: '',
  },

  data: {},

  init() {
    this.load();
    this.applyTheme();
    document.getElementById('btn-settings').addEventListener('click', () => this.open());
    document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());
  },

  toggleTheme() {
    this.data.theme = this.data.theme === 'light' ? 'monochrome' : 'light';
    this.save();
    this.applyTheme();
  },

  applyTheme() {
    const theme = this.data.theme || 'monochrome';
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    if (darkIcon && lightIcon) {
      darkIcon.style.display = theme === 'light' ? 'none' : 'block';
      lightIcon.style.display = theme === 'light' ? 'block' : 'none';
    }
  },

  load() {
    const raw = Data.get('central_settings');
    this.data = raw ? { ...this.defaults, ...raw } : { ...this.defaults };
    // Clean up old autoTheme if present
    delete this.data.autoTheme;
  },

  save() {
    Data.save('central_settings', this.data);
  },

  get(key) {
    return this.data[key] || this.defaults[key];
  },

  async open() {
    // Fetch available models for the dropdown
    let models = [];
    try {
      const res = await fetch('/api/ollama/models');
      const data = await res.json();
      if (data.models) models = data.models.map(m => m.name);
    } catch {}

    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Configurações';
    document.getElementById('modal-body').innerHTML = `
      <div class="settings-group">
        <label class="settings-label">Modelo da IA</label>
        <select class="settings-select" id="set-ai-model">
          ${models.length ? models.map(m =>
            `<option value="${m}" ${this.data.aiModel === m ? 'selected' : ''}>${m}</option>`
          ).join('') : '<option value="">Nenhum modelo disponivel</option>'}
        </select>
        <div class="settings-desc">Modelo usado pelo chat de IA</div>
      </div>
      <div class="settings-group">
        <label class="settings-label">URL do Ollama (para web)</label>
        <input class="settings-select" id="set-ollama-url" placeholder="http://localhost:11434" value="${this.data.ollamaUrl || ''}" style="background-image:none">
        <div class="settings-desc">Deixe vazio para usar localhost. Se estiver na web, coloque a URL do tunnel do seu PC (ex: https://seu-tunnel.trycloudflare.com)</div>
      </div>
      <div class="settings-group">
        <label class="settings-label">Cidade (clima)</label>
        <input class="settings-select" id="set-weather-city" placeholder="Ex: Sao Paulo" value="${this.data.weatherCity || ''}" style="background-image:none">
        <div class="settings-desc">Deixe vazio para detectar automaticamente</div>
      </div>
      <div class="settings-group">
        <label class="settings-label">YouTube API Key</label>
        <div style="display:flex;gap:6px">
          <input class="settings-select" id="set-yt-key" placeholder="Cole sua chave da API do YouTube" value="${this.data.youtubeApiKey || ''}" style="background-image:none;flex:1">
          <button id="set-yt-test" class="btn-secondary" style="padding:8px 12px;font-size:11px">TESTAR</button>
        </div>
        <div id="set-yt-status" style="font-size:11px;margin-top:4px;color:var(--text-tertiary)"></div>
        <div class="settings-desc">
          Necessario para buscar musicas. Crie em:
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color:var(--accent)">console.cloud.google.com</a>
          (Habilite YouTube Data API v3)
        </div>
      </div>
      <div class="settings-group" style="border-top:1px solid var(--border-subtle);padding-top:16px;margin-top:8px">
        <label class="settings-label">Versão Desktop (.exe)</label>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <a id="dl-exe" href="/builds/CentralPessoal.exe" class="btn-secondary" style="padding:8px 14px;text-decoration:none;display:inline-flex;align-items:center;gap:5px;display:none" download>
            ⬇ Baixar para Windows
          </a>
          <span id="dl-exe-na" style="font-size:12px;color:var(--text-tertiary);display:block">Indisponível na versão web</span>
        </div>
        <div class="settings-desc">Aplicativo desktop com Electron. ~180 MB. Execute sem precisar de navegador.</div>
      </div>
      <div class="settings-group" style="border-top:1px solid var(--border-subtle);padding-top:16px;margin-top:8px">
        <label class="settings-label">Exportar / Importar Dados</label>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
          <button id="export-data-btn" class="btn-secondary" style="padding:8px 14px">⬇ EXPORTAR</button>
          <button id="import-data-btn" class="btn-secondary" style="padding:8px 14px">⬆ IMPORTAR</button>
          <input type="file" id="import-file-input" accept=".json" style="display:none">
        </div>
        <div class="settings-desc">Exporta todo localStorage (.json) pra transferir entre dispositivos.</div>
      </div>
      <div class="settings-group" style="border-top:1px solid var(--border-subtle);padding-top:16px;margin-top:8px">
        <label class="settings-label">Google Drive</label>
        <div id="drive-status">
          <span class="drive-dot ${this.data.driveToken ? 'connected' : 'disconnected'}"></span>
          <span>${this.data.driveToken ? 'Conectado' : 'Desconectado'}</span>
        </div>
        <input class="settings-select" id="set-drive-client-id" placeholder="Seu Client ID do Google Cloud" value="${this.data.driveClientId || ''}" style="background-image:none;font-size:11px;margin-top:6px">
        <div class="settings-desc">
          Crie em:
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" style="color:var(--accent)">console.cloud.google.com</a>
          (Web application, adicione seu domínio em Authorized JavaScript origins)
        </div>
        <div class="drive-btns" style="margin-top:8px">
          <button id="drive-connect-btn" class="btn-secondary" style="padding:8px">${this.data.driveToken ? 'RECONECTAR' : 'CONECTAR'}</button>
          <button id="drive-backup-btn" class="btn-secondary" style="padding:8px" ${this.data.driveToken ? '' : 'disabled'}>BACKUP</button>
          <button id="drive-restore-btn" class="btn-secondary" style="padding:8px" ${this.data.driveToken ? '' : 'disabled'}>RESTAURAR</button>
        </div>
      </div>
    `;
    document.getElementById('modal-confirm').textContent = 'SALVAR';
    document.getElementById('modal-cancel').textContent = 'CANCELAR';
    overlay.classList.remove('hidden');

    const save = () => {
      const g = (id) => document.getElementById(id);
      try {
        if (g('set-ai-model')) this.data.aiModel = g('set-ai-model').value;
        if (g('set-weather-city')) this.data.weatherCity = g('set-weather-city').value.trim();
        if (g('set-yt-key')) this.data.youtubeApiKey = g('set-yt-key').value.trim();
        if (g('set-drive-client-id')) this.data.driveClientId = g('set-drive-client-id').value.trim();
        if (g('set-ollama-url')) this.data.ollamaUrl = g('set-ollama-url').value.trim();
      } catch {}
      this.save();
      if (this.data.ollamaUrl) {
        fetch('/api/ollama/set-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: this.data.ollamaUrl }),
        }).catch(() => {});
      }
      this.close();
    };

    document.getElementById('modal-confirm').onclick = save;
    document.getElementById('modal-cancel').onclick = () => this.close();
    document.getElementById('modal-close').onclick = () => this.close();

    document.getElementById('drive-connect-btn').addEventListener('click', () => this.driveConnect());
    document.getElementById('drive-backup-btn').addEventListener('click', () => this.driveBackup());
    document.getElementById('drive-restore-btn').addEventListener('click', () => this.driveRestore());

    document.getElementById('set-yt-test').addEventListener('click', () => this.testYtKey());

    document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
    document.getElementById('import-data-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', (e) => this.importData(e));

    // Check if .exe download is available
    fetch('/builds/CentralPessoal.exe', { method: 'HEAD' }).then(r => {
      if (r.ok) {
        const btn = document.getElementById('dl-exe');
        const na = document.getElementById('dl-exe-na');
        if (btn) btn.style.display = 'inline-flex';
        if (na) na.style.display = 'none';
      }
    }).catch(() => {});

    const keyHandler = (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', keyHandler);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    this._cleanup = () => document.removeEventListener('keydown', keyHandler);
  },

  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    if (this._cleanup) this._cleanup();
  },

  async testYtKey() {
    const key = document.getElementById('set-yt-key').value.trim();
    const statusEl = document.getElementById('set-yt-status');
    if (!key) { statusEl.textContent = '⚠️ Cole uma chave primeiro.'; return; }
    statusEl.textContent = '⏳ Testando...';
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${key}`);
      const data = await res.json();
      if (data.error) {
        statusEl.textContent = `❌ ${data.error.message}`;
      } else {
        statusEl.innerHTML = '✅ Válida! <span style="color:var(--text-tertiary)">(YouTube Data API v3 ativa)</span>';
      }
    } catch {
      statusEl.textContent = '❌ Erro de conexão. Verifique sua internet.';
    }
  },

  // --- Google Drive ---
  driveConnect() {
    const clientId = this.data.driveClientId || document.getElementById('set-drive-client-id')?.value?.trim();
    if (!clientId) { alert('Coloque seu Client ID do Google Cloud primeiro.'); return; }
    this.data.driveClientId = clientId;

    if (typeof google === 'undefined' || !google.accounts) {
      alert('Carregando Google Identity Services... Tente novamente.');
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response.access_token) {
          this.data.driveToken = response.access_token;
          this.save();
          alert('✅ Google Drive conectado!');
          this.open();
        } else if (response.error) {
          alert('Erro: ' + response.error);
        }
      },
      error_callback: () => {
        alert('Conexão cancelada ou erro de autenticação.');
      },
    });
    client.requestAccessToken();
  },

  async driveBackup() {
    if (!this.data.driveToken) { alert('Conecte ao Google Drive primeiro.'); return; }
    try {
      const backup = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('central_')) backup[key] = JSON.parse(localStorage.getItem(key));
      }
      backup._backupDate = new Date().toISOString();
      backup._version = 1;

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const metadata = { name: `central-backup-${new Date().toISOString().slice(0, 10)}.json`, mimeType: 'application/json' };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.data.driveToken}` },
        body: form,
      });
      const result = await res.json();
      if (result.id) {
        alert(`✅ Backup salvo no Drive!\nArquivo: ${metadata.name}`);
      } else {
        alert('Erro ao fazer backup: ' + (result.error?.message || 'desconhecido'));
      }
    } catch (e) {
      alert('Erro ao conectar com Drive. Token pode ter expirado. Reconecte.');
      this.data.driveToken = '';
      this.save();
    }
  },

  async driveRestore() {
    if (!this.data.driveToken) { alert('Conecte ao Google Drive primeiro.'); return; }
    if (!confirm('Restaurar vai SUBSTITUIR todos os dados atuais. Continuar?')) return;
    try {
      // List backup files
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name contains 'central-backup-' and mimeType='application/json'&orderBy=createdTime desc&pageSize=10`,
        { headers: { Authorization: `Bearer ${this.data.driveToken}` } }
      );
      const list = await listRes.json();
      if (!list.files || list.files.length === 0) {
        alert('Nenhum backup encontrado no Drive.');
        return;
      }

      const file = list.files[0];
      const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { Authorization: `Bearer ${this.data.driveToken}` },
      });
      const data = await dlRes.json();

      let count = 0;
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('central_') && key !== '_backupDate' && key !== '_version') {
          localStorage.setItem(key, JSON.stringify(value));
          try { await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }); } catch {}
          count++;
        }
      }
      alert(`✅ ${count} dados restaurados de: ${file.name}\nRecarregue a página.`);
      location.reload();
    } catch (e) {
      alert('Erro ao restaurar: token pode ter expirado. Reconecte.');
      this.data.driveToken = '';
      this.save();
    }
  },

  exportData() {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('central_')) backup[key] = JSON.parse(localStorage.getItem(key));
    }
    backup._exportDate = new Date().toISOString();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `central-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let count = 0;
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('central_') && key !== '_exportDate') {
            localStorage.setItem(key, JSON.stringify(value));
            fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }).catch(() => {});
            count++;
          }
        }
        alert(`✅ ${count} dados importados! Recarregando...`);
        location.reload();
      } catch {
        alert('❌ Arquivo inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },
};
