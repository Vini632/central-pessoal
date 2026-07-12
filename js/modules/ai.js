const AI = {
  conversations: [],
  currentId: null,
  model: '',
  systemPrompt: '',
  chat: null, input: null, sendBtn: null,
  indicator: null, statusText: null,
  convList: null,
  attachments: [],

  renderMarkdown(text) {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const blocks = [];
    let i = 0, buf = '';
    const lines = escaped.split('\n');
    let inCode = false, codeBuf = '';

    for (const line of lines) {
      if (line.startsWith('&gt; ')) { blocks.push({ t: 'p', c: this.inline(line.slice(5)) }); continue; }
      if (line.startsWith('```')) {
        if (inCode) { blocks.push({ t: 'pre', c: codeBuf }); codeBuf = ''; inCode = false; }
        else { if (buf) { blocks.push({ t: 'p', c: this.inline(buf) }); buf = ''; } inCode = true; }
        continue;
      }
      if (inCode) { codeBuf += line + '\n'; continue; }
      if (line.startsWith('### ')) { if (buf) { blocks.push({ t: 'p', c: this.inline(buf) }); buf = ''; } blocks.push({ t: 'h3', c: this.inline(line.slice(4)) }); continue; }
      if (line.startsWith('## ')) { if (buf) { blocks.push({ t: 'p', c: this.inline(buf) }); buf = ''; } blocks.push({ t: 'h2', c: this.inline(line.slice(3)) }); continue; }
      if (line.startsWith('# ')) { if (buf) { blocks.push({ t: 'p', c: this.inline(buf) }); buf = ''; } blocks.push({ t: 'h1', c: this.inline(line.slice(2)) }); continue; }
      const listMatch = line.match(/^[-*]\s/);
      if (listMatch) { if (buf) { blocks.push({ t: 'p', c: this.inline(buf) }); buf = ''; } blocks.push({ t: 'li', c: this.inline(line.slice(2)) }); continue; }
      const numMatch = line.match(/^\d+\.\s/);
      if (numMatch) { if (buf) { blocks.push({ t: 'p', c: this.inline(buf) }); buf = ''; } blocks.push({ t: 'li', c: this.inline(line.slice(numMatch[0].length)) }); continue; }
      if (line.trim() === '') { if (buf) { blocks.push({ t: 'p', c: this.inline(buf) }); buf = ''; } continue; }
      buf += (buf ? ' ' : '') + line;
    }
    if (codeBuf) blocks.push({ t: 'pre', c: codeBuf });
    if (buf) blocks.push({ t: 'p', c: this.inline(buf) });
    return blocks.map(b => {
      if (b.t === 'pre') return `<pre><code>${b.c}</code></pre>`;
      if (b.t === 'li') return `<li>${b.c}</li>`;
      if (b.t === 'h1') return `<h1>${b.c}</h1>`;
      if (b.t === 'h2') return `<h2>${b.c}</h2>`;
      if (b.t === 'h3') return `<h3>${b.c}</h3>`;
      return `<p>${b.c}</p>`;
    }).join('');
  },

  inline(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  },

  init() {
    const section = document.getElementById('mod-ai');
    if (!section) return;

    section.innerHTML = `
      <div class="module-header">
        <h2>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a4 4 0 014 4c0 1.95-2 3-2 8h-4c0-5-2-6.05-2-8a4 4 0 014-4z"/><path d="M10 14h4"/><path d="M10 18h4"/><path d="M11 22h2"/></svg>
          IA Local
        </h2>
        <div id="ai-status">
          <div id="ai-indicator" class="disconnected"></div>
          <span id="ai-status-text">iniciando...</span>
        </div>
        <button id="ai-new-chat" class="btn-primary" style="padding:8px 14px;font-size:11px">NOVO CHAT</button>
        <input type="file" id="ai-file-input" accept=".txt,.md,.json,.csv,.js,.py,.html,.css,.xml,.yaml,.log,.ini,.cfg" style="display:none" multiple>
        <input type="file" id="ai-image-input" accept="image/*" style="display:none" multiple>
      </div>
      <div id="ai-layout">
        <div id="ai-conv-list"><div class="ai-conv-title">Conversas</div></div>
        <div id="ai-chat">
          <div id="ai-messages"></div>
          <div id="ai-attachments"></div>
          <div id="ai-input-line">
            <button id="ai-file-btn" class="btn-icon" title="Anexar arquivo" style="padding:8px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button id="ai-link-btn" class="btn-icon" title="Adicionar link" style="padding:8px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            </button>
            <button id="ai-image-btn" class="btn-icon" title="Anexar imagem" style="padding:8px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
            <button id="ai-search-btn" class="btn-icon" title="Pesquisar na web" style="padding:8px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button id="ai-voice-btn" class="btn-icon" title="Dictar" style="padding:8px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </button>
            <textarea id="ai-input" rows="1" placeholder="Pergunte algo a IA..." disabled></textarea>
            <button id="ai-send" class="btn-primary" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    this.chat = document.getElementById('ai-messages');
    this.input = document.getElementById('ai-input');
    this.sendBtn = document.getElementById('ai-send');
    this.indicator = document.getElementById('ai-indicator');
    this.statusText = document.getElementById('ai-status-text');
    this.convList = document.getElementById('ai-conv-list');

    this.loadConversations();
    this.renderConvList();
    this.loadChat();

    document.getElementById('ai-new-chat').addEventListener('click', () => this.newChat());
    document.getElementById('ai-file-btn').addEventListener('click', () => document.getElementById('ai-file-input').click());
    document.getElementById('ai-file-input').addEventListener('change', (e) => this.handleFiles(e.target.files));
    document.getElementById('ai-image-btn').addEventListener('click', () => document.getElementById('ai-image-input').click());
    document.getElementById('ai-image-input').addEventListener('change', (e) => this.handleImages(e.target.files));
    document.getElementById('ai-link-btn').addEventListener('click', () => this.promptLink());
    document.getElementById('ai-search-btn').addEventListener('click', () => this.promptSearch());
    document.getElementById('ai-voice-btn').addEventListener('click', function() {
      const input = document.getElementById('ai-input');
      if (Voice.recognition) Voice.stop(this);
      else Voice.start(input, this);
    });

    this.bootstrap();
  },

  loadConversations() {
    try {
      const saved = Data.get('central_ai_conversations');
      if (saved && saved.length > 0) {
        this.conversations = saved;
        // Clean up old single-message format
        this.conversations = this.conversations.filter(c => c && c.id);
        // Ensure every conv has messages array
        this.conversations.forEach(c => { if (!c.messages) c.messages = []; });
      } else {
        // Migrate old messages
        const oldMsgs = Data.get('central_ai_messages') || [];
        if (oldMsgs.length > 0) {
          this.conversations = [{ id: 'conv_1', title: 'Conversa 1', messages: oldMsgs, created: Date.now(), updated: Date.now() }];
          Data.save('central_ai_conversations', this.conversations);
        } else {
          this.conversations = [];
        }
      }
    } catch {
      this.conversations = [];
    }
  },

  saveConversations() {
    try { Data.save('central_ai_conversations', this.conversations); } catch {}
  },

  get currentConv() {
    return this.conversations.find(c => c.id === this.currentId);
  },

  newChat() {
    const id = 'conv_' + Date.now().toString(36);
    this.conversations.push({
      id, title: 'Conversa ' + (this.conversations.length + 1), messages: [], created: Date.now(), updated: Date.now(),
    });
    this.currentId = id;
    this.saveConversations();
    this.renderConvList();
    this.loadChat();
    this.scrollConv();
  },

  switchChat(id) {
    this.currentId = id;
    this.attachments = [];
    this.renderAttachments();
    this.loadChat();
    this.scrollConv();
  },

  deleteChat(id, e) {
    e.stopPropagation();
    if (!confirm('Excluir esta conversa?')) return;
    this.conversations = this.conversations.filter(c => c.id !== id);
    if (this.currentId === id) this.currentId = this.conversations.length > 0 ? this.conversations[0].id : null;
    this.saveConversations();
    this.renderConvList();
    this.loadChat();
  },

  renameChat(id) {
    const conv = this.conversations.find(c => c.id === id);
    if (!conv) return;
    const name = prompt('Nome da conversa:', conv.title);
    if (name && name.trim()) { conv.title = name.trim(); conv.updated = Date.now(); this.saveConversations(); this.renderConvList(); }
  },

  scrollConv() {
    const active = this.convList.querySelector('.ai-conv-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  },

  renderConvList() {
    this.convList.innerHTML = '<div class="ai-conv-title">Conversas</div>' +
      this.conversations.map(c => {
        const preview = c.messages.length > 0 ? c.messages[c.messages.length - 1].content.slice(0, 40) : 'Vazio';
        return `<div class="ai-conv-item ${c.id === this.currentId ? 'active' : ''}" data-id="${c.id}">
          <div class="ai-conv-item-top">
            <span class="ai-conv-name">${c.title.replace(/</g, '&lt;')}</span>
            <button class="ai-conv-del" data-id="${c.id}" title="Excluir">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="ai-conv-preview">${preview.replace(/</g, '&lt;')}</div>
        </div>`;
      }).join('');

    this.convList.querySelectorAll('.ai-conv-item').forEach(el => {
      el.addEventListener('click', () => this.switchChat(el.dataset.id));
      el.addEventListener('dblclick', () => this.renameChat(el.dataset.id));
    });
    this.convList.querySelectorAll('.ai-conv-del').forEach(btn => {
      btn.addEventListener('click', (e) => this.deleteChat(btn.dataset.id, e));
    });
  },

  loadChat() {
    this.chat.innerHTML = '';
    const conv = this.currentConv;
    if (!conv) {
      this.chat.innerHTML = '<div class="ai-empty-chat">Nenhuma conversa ativa. Crie uma nova!</div>';
      this.input.disabled = true;
      this.sendBtn.disabled = true;
      return;
    }
    this.input.disabled = false;
    this.sendBtn.disabled = false;
    conv.messages.forEach(m => {
      if (m.role === 'system') this.addSystem(m.content, false);
      else this.addMessage(m.role, m.content, false);
    });
    this.chat.scrollTop = this.chat.scrollHeight;
  },

  async bootstrap() {
    try {
      let res = await fetch('/api/ollama/status');
      let data = await res.json();

      if (data.running) {
        this.setStatus('connected', 'conectado');
      } else {
        this.addSystem('Ollama não encontrado. Iniciando...');
        this.setStatus('connecting', 'iniciando...');
        res = await fetch('/api/ollama/start');
        data = await res.json();
        if (!data.started) {
          this.addSystem('⚠️ Ollama offline. O chat funcionará quando o Ollama estiver disponível.');
          this.setStatus('disconnected', 'offline');
          this.sendBtn.disabled = true;
          return;
        }
        this.setStatus('connected', 'conectado');
      }
    } catch (e) {
      this.addSystem('⚠️ Servidor Ollama não acessível. O chat funcionará quando disponível.');
      this.setStatus('disconnected', 'offline');
      this.sendBtn.disabled = true;
      console.error('AI bootstrap error:', e);
      return;
    }

    const settingsModel = Settings.get('aiModel');
    try {
      const res = await fetch('/api/ollama/models');
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        const names = data.models.map(m => m.name);
        if (settingsModel && names.includes(settingsModel)) this.model = settingsModel;
        else {
          const sorted = [...data.models].sort((a, b) => (a.size || 0) - (b.size || 0));
          this.model = sorted[0].name;
          if (settingsModel) this.addSystem(`Modelo "${settingsModel}" não disponível. Usando "${this.model}"`);
        }
        this.addSystem(`Modelo: ${this.model}`);
      } else {
        this.addSystem('Nenhum modelo encontrado.');
        this.input.disabled = true; this.sendBtn.disabled = true;
        return;
      }
    } catch {}

    // Carregar instruções do arquivo
    try {
      const instRes = await fetch('/api/ai/instructions');
      const instData = await instRes.json();
      if (instData.content) {
        this.systemPrompt = instData.content;
        this.addSystem('📄 Instruções carregadas do arquivo');
      }
    } catch {}

    // Verificar se o modelo suporta visão
    const visionModels = ['llava', 'bakllava', 'vision', 'minicpm', 'moondream', 'cogvlm', 'qwen-vl'];
    const isVision = visionModels.some(v => this.model.toLowerCase().includes(v));
    if (isVision) {
      this.addSystem('🖼️ Modelo com suporte a imagens detectado');
    } else {
      this.addSystem('ℹ️ Modelo atual não suporta imagens (enviar imagem pode falhar)');
    }

    this.input.placeholder = 'Pergunte algo a IA...';
    this.input.focus();

    this.sendBtn.addEventListener('click', () => this.send());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
    });
    this.input.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 150) + 'px';
    });
    document.getElementById('ai-chat').addEventListener('click', () => this.input.focus());
  },

  setStatus(state, text) { this.indicator.className = state; this.statusText.textContent = text; },

  // --- Attachments ---
  handleFiles(files) {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.attachments.push({ type: 'file', name: file.name, content: e.target.result.slice(0, 10000) });
        this.renderAttachments();
      };
      reader.readAsText(file);
    }
    document.getElementById('ai-file-input').value = '';
  },

  handleImages(files) {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.attachments.push({ type: 'image', name: file.name, content: e.target.result, raw: e.target.result.split(',')[1] });
        this.renderAttachments();
      };
      reader.readAsDataURL(file);
    }
    document.getElementById('ai-image-input').value = '';
  },

  async promptLink() {
    const url = prompt('Cole a URL:');
    if (!url || !url.trim()) return;
    const linkBtn = document.getElementById('ai-link-btn');
    linkBtn.disabled = true; linkBtn.textContent = '⋯';
    try {
      const res = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (data.content) {
        this.attachments.push({ type: 'link', name: data.title || url, url: url.trim(), content: data.content.slice(0, 5000) });
        this.renderAttachments();
      } else {
        alert('Não foi possível ler o link.');
      }
    } catch { alert('Erro ao acessar link.'); }
    linkBtn.disabled = false; linkBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>';
  },

  async promptSearch() {
    const q = prompt('Pesquisar na web:');
    if (!q || !q.trim()) return;
    const searchBtn = document.getElementById('ai-search-btn');
    searchBtn.disabled = true; searchBtn.innerHTML = '⋯';
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: q.trim() }) });
      const data = await res.json();
      if (data.content) {
        this.attachments.push({ type: 'search', name: 'Web: ' + q.trim().slice(0, 40), content: data.content });
        this.renderAttachments();
      } else {
        alert('Nenhum resultado encontrado.');
      }
    } catch { alert('Erro na pesquisa.'); }
    searchBtn.disabled = false; searchBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  },

  removeAttachment(i) {
    this.attachments.splice(i, 1);
    this.renderAttachments();
  },

  renderAttachments() {
    const el = document.getElementById('ai-attachments');
    if (this.attachments.length === 0) { el.innerHTML = ''; el.classList.remove('has'); return; }
    el.classList.add('has');
    el.innerHTML = this.attachments.map((a, i) => {
      let icon = '📄';
      if (a.type === 'image') icon = '🖼';
      else if (a.type === 'link') icon = '🔗';
      else if (a.type === 'search') icon = '🔍';
      return `<div class="ai-attach-item">
        <span>${icon}</span>
        <span class="ai-attach-name">${a.name.replace(/</g, '&lt;')}</span>
        <button class="ai-attach-del" data-index="${i}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
    }).join('');
    el.querySelectorAll('.ai-attach-del').forEach(btn => {
      btn.addEventListener('click', () => this.removeAttachment(parseInt(btn.dataset.index)));
    });
  },

  // --- Send ---
  async send() {
    const text = this.input.value.trim();
    const conv = this.currentConv;
    if ((!text && this.attachments.length === 0) || !conv) return;

    // Build prompt with attachments
    let prompt = text;
    if (this.attachments.length > 0) {
      const parts = [text];
      for (const a of this.attachments) {
        if (a.type === 'file') parts.push(`\n--- Arquivo: ${a.name} ---\n${a.content}`);
        else if (a.type === 'link') parts.push(`\n--- Conteúdo de: ${a.name} (${a.url}) ---\n${a.content}`);
        else if (a.type === 'image') parts.push(`\n--- Imagem: ${a.name} ---`);
      }
      prompt = parts.join('\n');
    }

    this.input.value = '';
    this.input.style.height = 'auto';

    this.addMessage('user', text || '(arquivos anexados)');
    conv.messages.push({ role: 'user', content: text || '(arquivos anexados)', timestamp: Date.now() });

    const msgEl = this.addMessage('assistant', '', false);
    const contentEl = msgEl.querySelector('.msg-content');
    contentEl.textContent = '';
    this.setStatus('connected', 'pensando...');

    let fullResponse = '';
    const imageData = this.attachments.filter(a => a.type === 'image').map(a => a.raw);

    try {
      const body = { model: this.model, prompt, stream: true, system: this.systemPrompt || undefined };
      if (imageData.length > 0) body.images = imageData;

      const res = await fetch('/api/ollama/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.response) {
              fullResponse += chunk.response;
              contentEl.textContent = fullResponse;
              this.chat.scrollTop = this.chat.scrollHeight;
            }
            if (chunk.done) break;
          } catch {}
        }
      }

      if (!fullResponse) throw new Error('Resposta vazia');

      contentEl.innerHTML = this.renderMarkdown(fullResponse);
      conv.messages.push({ role: 'assistant', content: fullResponse, timestamp: Date.now() });
      conv.updated = Date.now();
      // Auto-title from first message
      if (conv.messages.length === 2) {
        conv.title = text.slice(0, 40) || 'Conversa';
      }
      this.attachments = [];
      this.renderAttachments();
      this.saveConversations();
      this.renderConvList();
      this.setStatus('connected', 'conectado');
    } catch (err) {
      contentEl.textContent = `⚠️ ${err.message}`;
      this.setStatus('disconnected', 'erro');
      this.addSystem('Tente novamente ou verifique se o Ollama está rodando');
    }
  },

  addMessage(role, content, save = true) {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    const label = role === 'user' ? 'Você' : 'IA';
    const html = role === 'assistant' ? this.renderMarkdown(content) : content.replace(/\n/g, '<br>');
    msg.innerHTML = `<div class="msg-label">${label}</div><div class="msg-content">${role === 'assistant' && content ? this.renderMarkdown(content) : html}</div>`;
    this.chat.appendChild(msg);
    this.chat.scrollTop = this.chat.scrollHeight;
    return msg;
  },

  addSystem(text, save = true) {
    const conv = this.currentConv;
    const msg = document.createElement('div');
    msg.className = 'message system';
    msg.innerHTML = `<div class="msg-content" style="color:#555;font-size:12px">${text}</div>`;
    this.chat.appendChild(msg);
    this.chat.scrollTop = this.chat.scrollHeight;
  },
};
