const Escrita = {
  tree: null,
  currentFile: null,
  previewMode: false,
  dirty: false,
  aiOpen: false,
  aiLoading: false,

  init() {
    const section = document.getElementById('mod-escrita');
    section.innerHTML = `
      <div class="module-header">
        <h2>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Escrita — Castelo Aurora
        </h2>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="escrita-refresh" class="btn-icon" title="Recarregar árvore">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          </button>
          <button id="escrita-save" class="btn-primary" disabled>Salvar</button>
        </div>
      </div>
      <div id="escrita-body">
        <div id="escrita-tree"></div>
        <div id="escrita-editor">
          <div id="escrita-editor-header">
            <span id="escrita-filename">Nenhum arquivo selecionado</span>
            <label id="escrita-toggle-preview" class="toggle-label">
              <input type="checkbox" id="escrita-preview-check">
              <span class="toggle-slider"></span>
              <span>Preview</span>
            </label>
          </div>
          <textarea id="escrita-textarea" placeholder="Selecione um arquivo na árvore ao lado para começar a escrever..." style="display:none"></textarea>
          <div id="escrita-preview" style="display:none"></div>
          <div id="escrita-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" style="opacity:0.3"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <p>Selecione um arquivo na árvore para editar</p>
          </div>
        </div>
        <button id="escrita-ai-fab" title="IA de Escrita">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a4 4 0 014 4c0 1.95-2 3-2 8h-4c0-5-2-6.05-2-8a4 4 0 014-4z"/><path d="M10 14h4"/><path d="M10 18h4"/><path d="M11 22h2"/></svg>
        </button>
        <div id="escrita-ai-sidebar">
          <div id="escrita-ai-sidebar-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a4 4 0 014 4c0 1.95-2 3-2 8h-4c0-5-2-6.05-2-8a4 4 0 014-4z"/><path d="M10 14h4"/><path d="M10 18h4"/><path d="M11 22h2"/></svg>
            <span>IA de Escrita</span>
            <button id="escrita-ai-close" class="btn-icon" style="margin-left:auto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div id="escrita-ai-quick-row">
            <button class="escrita-ai-quick" data-prompt="Continue esta cena no mesmo estilo e tom">Continuar</button>
            <button class="escrita-ai-quick" data-prompt="Sugira o que pode acontecer a seguir">Sugerir</button>
            <button class="escrita-ai-quick" data-prompt="Revise este texto: ritmo, dialogo, consistencia">Revisar</button>
          </div>
          <div id="escrita-ai-response"></div>
          <div id="escrita-ai-input-row">
            <input id="escrita-ai-input" type="text" placeholder="O que a IA deve fazer?" autocomplete="off">
            <button id="escrita-ai-send" class="btn-primary" style="padding:6px 14px;font-size:12px">Enviar</button>
          </div>
        </div>
      </div>`;
    this.loadTree();
    document.getElementById('escrita-refresh').addEventListener('click', () => this.loadTree());
    document.getElementById('escrita-save').addEventListener('click', () => this.save());
    document.getElementById('escrita-preview-check').addEventListener('change', (e) => {
      this.previewMode = e.target.checked;
      this.togglePreview();
    });
    document.getElementById('escrita-textarea').addEventListener('input', () => {
      this.dirty = true;
      document.getElementById('escrita-save').disabled = false;
    });
    document.getElementById('escrita-ai-fab').addEventListener('click', () => this._toggleAi());
    document.getElementById('escrita-ai-close').addEventListener('click', () => this._toggleAi());
    document.getElementById('escrita-ai-send').addEventListener('click', () => this._askAi());
    document.getElementById('escrita-ai-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._askAi();
    });
    document.querySelectorAll('.escrita-ai-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('escrita-ai-input').value = btn.dataset.prompt;
        this._askAi();
      });
    });
    this._addKeybindings();
  },

  _toggleAi() {
    this.aiOpen = !this.aiOpen;
    document.getElementById('escrita-ai-sidebar').classList.toggle('open', this.aiOpen);
    document.getElementById('escrita-ai-fab').style.display = this.aiOpen ? 'none' : 'flex';
    if (this.aiOpen) document.getElementById('escrita-ai-input').focus();
  },

  async _askAi() {
    const input = document.getElementById('escrita-ai-input');
    const responseEl = document.getElementById('escrita-ai-response');
    const prompt = input.value.trim();
    if (!prompt || this.aiLoading) return;

    this.aiLoading = true;
    document.getElementById('escrita-ai-send').disabled = true;
    input.disabled = true;
    responseEl.innerHTML = '<div class="escrita-ai-thinking">Pensando...</div>';

    const textarea = document.getElementById('escrita-textarea');
    const currentText = textarea.style.display !== 'none' ? textarea.value : '';

    try {
      const res = await apiFetch('/api/escrita/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, currentText }),
      });
      const data = await res.json();
      if (data.content) {
        const escaped = data.content.replace(/`/g, '\\`').replace(/\${/g, '\\${');
        responseEl.innerHTML = `<div class="escrita-ai-msg">${marked.parse(data.content)}</div>
          <button class="escrita-ai-insert" onclick="Escrita._insertAi()">Inserir no texto</button>`;
        this._lastResponse = data.content;
      } else {
        responseEl.innerHTML = '<div class="escrita-ai-msg" style="color:var(--red)">Resposta vazia</div>';
      }
    } catch {
      responseEl.innerHTML = '<div class="escrita-ai-msg" style="color:var(--red)">Erro ao contactar IA</div>';
    }
    this.aiLoading = false;
    document.getElementById('escrita-ai-send').disabled = false;
    input.disabled = false;
    input.focus();
  },

  _lastResponse: '',

  _insertAi() {
    if (!this._lastResponse) return;
    const textarea = document.getElementById('escrita-textarea');
    const start = textarea.selectionStart;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(textarea.selectionEnd);
    textarea.value = before + this._lastResponse + after;
    const pos = start + this._lastResponse.length;
    textarea.selectionStart = textarea.selectionEnd = pos;
    textarea.dispatchEvent(new Event('input'));
    Toast.success('Texto inserido!');
  },

  _addKeybindings() {
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('mod-escrita').classList.contains('active')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.save();
      }
    });
  },

  async loadTree() {
    const treeEl = document.getElementById('escrita-tree');
    treeEl.innerHTML = '<div style="padding:16px;opacity:0.5">Carregando...</div>';
    try {
      const data = await apiFetch('/api/escrita');
      this.tree = data;
      treeEl.innerHTML = this._renderTree(data);
      treeEl.querySelectorAll('.tree-item').forEach(item => {
        item.addEventListener('click', () => this.openFile(item.dataset.path));
      });
    } catch {
      treeEl.innerHTML = '<div style="padding:16px;color:var(--red)">Erro ao carregar</div>';
    }
  },

  _renderTree(node) {
    if (!node || !node.children) return '';
    let html = '<ul class="tree-list">';
    for (const child of node.children) {
      if (child.type === 'dir') {
        html += `<li class="tree-dir">
          <span class="tree-label tree-dir-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            ${child.name}
          </span>
          ${this._renderTree(child)}
        </li>`;
      } else {
        html += `<li><span class="tree-label tree-item" data-path="${child.path}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          ${child.name}
        </span></li>`;
      }
    }
    html += '</ul>';
    return html;
  },

  async openFile(filePath) {
    this.currentFile = filePath;
    this.dirty = false;
    document.getElementById('escrita-save').disabled = true;
    document.getElementById('escrita-empty').style.display = 'none';

    const treeEl = document.getElementById('escrita-tree');
    treeEl.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
    const sel = treeEl.querySelector(`.tree-item[data-path="${filePath}"]`);
    if (sel) sel.classList.add('active');

    try {
      const data = await apiFetch(`/api/escrita?path=${encodeURIComponent(filePath)}`);
      document.getElementById('escrita-filename').textContent = filePath;
      const textarea = document.getElementById('escrita-textarea');
      textarea.value = data.content || '';
      textarea.style.display = 'block';
      if (this.previewMode) this.renderPreview(data.content || '');
      else document.getElementById('escrita-preview').style.display = 'none';
    } catch {
      Toast.error('Erro ao abrir arquivo');
    }
  },

  togglePreview() {
    const textarea = document.getElementById('escrita-textarea');
    const preview = document.getElementById('escrita-preview');
    if (this.previewMode) {
      this.renderPreview(textarea.value);
      textarea.style.display = 'none';
      preview.style.display = 'block';
    } else {
      textarea.style.display = 'block';
      preview.style.display = 'none';
    }
  },

  renderPreview(content) {
    const preview = document.getElementById('escrita-preview');
    try {
      preview.innerHTML = marked.parse(content || '*Vazio*');
    } catch {
      preview.innerHTML = '<p style="color:var(--red)">Erro ao renderizar preview</p>';
    }
  },

  async save() {
    if (!this.currentFile) return;
    const content = document.getElementById('escrita-textarea').value;
    try {
      const res = await apiFetch('/api/escrita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: this.currentFile, content }),
      });
      if (res.ok) {
        this.dirty = false;
        document.getElementById('escrita-save').disabled = true;
        if (this.previewMode) this.renderPreview(content);
        Toast.success('Salvo!');
      } else {
        Toast.error('Erro ao salvar');
      }
    } catch {
      Toast.error('Erro ao salvar');
    }
  },
};
