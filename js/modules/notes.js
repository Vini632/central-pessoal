const Notes = {
  data: [],
  previews: {},

  init() {
    this.load();
    this.render();
    document.getElementById('notes-add').addEventListener('click', () => this.create());
  },

  load() {
    this.data = Data.get('central_notes') || [];
  },

  save() {
    Data.save('central_notes', this.data);
    this.updateStats();
  },

  create() {
    const note = {
      id: Date.now().toString(36),
      content: '',
      images: [],
      date: new Date().toISOString(),
    };
    this.data.unshift(note);
    this.save();
    this.render();

    setTimeout(() => {
      const textarea = document.querySelector(`[data-note-id="${note.id}"] textarea`);
      if (textarea) textarea.focus();
    }, 50);
  },

  delete(id) {
    this.data = this.data.filter(n => n.id !== id);
    this.save();
    this.render();
  },

  saveContent(id, content) {
    const note = this.data.find(n => n.id === id);
    if (note) {
      note.content = content;
      note.date = new Date().toISOString();
      this.save();
    }
  },

  togglePreview(id) {
    this.previews[id] = !this.previews[id];
    this.render();
    const card = document.querySelector(`[data-note-id="${id}"]`);
    if (card && this.previews[id]) {
      const preview = card.querySelector('.note-preview');
      const textarea = card.querySelector('textarea');
      if (preview && textarea) {
        preview.innerHTML = marked.parse(textarea.value || '*Vazio*');
      }
    }
  },

  render() {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';

    if (this.data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);grid-column:1/-1">Nenhuma nota ainda</div>';
      return;
    }

    this.data.forEach(note => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.dataset.noteId = note.id;

      const previewMode = this.previews[note.id] || false;
      const dateStr = new Date(note.date).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      card.innerHTML = `
        <div class="note-date">${dateStr}</div>
        <div class="note-content-area">
          <div style="display:flex;gap:4px;align-items:flex-start">
            <textarea placeholder="Escreva sua nota... (Markdown)" data-id="${note.id}" style="${previewMode ? 'display:none' : ''};flex:1">${note.content}</textarea>
            <button class="voice-btn note-voice-btn" data-id="${note.id}" title="Dictar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </button>
          </div>
          <div class="note-preview" style="${previewMode ? 'display:block' : 'display:none'}">${previewMode ? marked.parse(note.content || '*Vazio*') : ''}</div>
          ${note.images && note.images.length > 0 ? `<div class="note-images">${note.images.map(img => `<img src="${img}" class="note-image" data-img="${img}" loading="lazy">`).join('')}</div>` : ''}
          <div style="display:flex;gap:4px;margin-top:6px">
            <button id="note-add-image-btn" data-id="${note.id}" title="Adicionar imagem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Foto
            </button>
            <input type="file" accept="image/*" class="note-image-input" data-id="${note.id}" multiple style="display:none">
          </div>
        </div>
        <div class="note-actions">
          <button class="btn-secondary note-preview-btn" data-id="${note.id}">${previewMode ? 'EDITAR' : 'PREVIEW'}</button>
          <button class="btn-danger" data-id="${note.id}">EXCLUIR</button>
        </div>
      `;

      const textarea = card.querySelector('textarea');
      textarea.addEventListener('input', () => {
        this.saveContent(note.id, textarea.value);
        if (this.previews[note.id]) {
          const preview = card.querySelector('.note-preview');
          if (preview) preview.innerHTML = marked.parse(textarea.value || '*Vazio*');
        }
      });

      card.querySelector('.note-preview-btn').addEventListener('click', () => {
        this.togglePreview(note.id);
      });

      card.querySelector('.btn-danger').addEventListener('click', () => {
        this.delete(note.id);
      });

      const voiceBtn = card.querySelector('.note-voice-btn');
      if (voiceBtn) {
        const ta = card.querySelector('textarea');
        voiceBtn.addEventListener('click', () => {
          if (Voice.recognition) Voice.stop(voiceBtn);
          else Voice.start(ta, voiceBtn);
        });
      }

      const imgBtn = card.querySelector('#note-add-image-btn');
      const imgInput = card.querySelector('.note-image-input');
      if (imgBtn && imgInput) {
        imgBtn.addEventListener('click', () => imgInput.click());
        imgInput.addEventListener('change', (e) => this.addImages(note.id, e.target.files));
      }

      card.querySelectorAll('.note-image').forEach(el => {
        el.addEventListener('click', () => this.openImage(el.dataset.img));
      });

      container.appendChild(card);
    });
  },

  addImages(id, files) {
    const note = this.data.find(n => n.id === id);
    if (!note || !files.length) return;
    if (!note.images) note.images = [];
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        note.images.push(e.target.result);
        if (files.length === 1 || note.images.length >= (note.images.length + files.length - 1)) {
          this.save();
          this.render();
        }
      };
      reader.readAsDataURL(file);
    }
    // Save on last image load
    if (files.length > 1) {
      let loaded = 0;
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = (e) => {
          note.images.push(e.target.result);
          loaded++;
          if (loaded === files.length) { this.save(); this.render(); }
        };
        reader.readAsDataURL(file);
      }
    }
  },

  openImage(src) {
    const div = document.createElement('div');
    div.className = 'note-image-modal';
    div.innerHTML = `<img src="${src}" alt="">`;
    div.addEventListener('click', () => div.remove());
    document.body.appendChild(div);
  },

  updateStats() {
    const el = document.getElementById('stat-notes');
    if (el) el.textContent = this.data.length;
  },
};
