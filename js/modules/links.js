const Links = {
  data: [],

  init() {
    this.load();
    this.render();
    document.getElementById('links-add').addEventListener('click', () => this.showModal());
  },

  load() {
    this.data = Data.get('central_links') || [];
  },

  save() {
    Data.save('central_links', this.data);
    this.updateStats();
  },

  showModal(editLink = null) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const confirm = document.getElementById('modal-confirm');
    const cancel = document.getElementById('modal-cancel');
    const close = document.getElementById('modal-close');

    const isEdit = editLink !== null;
    title.textContent = isEdit ? 'Editar Link' : 'Novo Link';

    body.innerHTML = `
      <input id="modal-link-title" placeholder="Nome do link" value="${isEdit ? editLink.title : ''}" autofocus>
      <input id="modal-link-url" placeholder="URL (https://...)" value="${isEdit ? editLink.url : ''}" style="margin-top:8px">
    `;

    overlay.classList.remove('hidden');

    const closeModal = () => {
      overlay.classList.add('hidden');
    };

    const handleConfirm = () => {
      const nameInput = document.getElementById('modal-link-title');
      const urlInput = document.getElementById('modal-link-url');
      const name = nameInput.value.trim();
      let url = urlInput.value.trim();

      if (!name || !url) return;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      if (isEdit) {
        editLink.title = name;
        editLink.url = url;
      } else {
        this.data.push({ id: Date.now().toString(36), title: name, url });
      }

      this.save();
      this.render();
      closeModal();
    };

    confirm.onclick = handleConfirm;
    cancel.onclick = closeModal;
    close.onclick = closeModal;

    const keyHandler = (e) => {
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', keyHandler);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const cleanup = () => {
      document.removeEventListener('keydown', keyHandler);
    };
    const origConfirm = confirm.onclick;
    confirm.onclick = () => { handleConfirm(); cleanup(); };
    cancel.onclick = () => { closeModal(); cleanup(); };
    close.onclick = () => { closeModal(); cleanup(); };
  },

  delete(id) {
    this.data = this.data.filter(l => l.id !== id);
    this.save();
    this.render();
  },

  render() {
    const container = document.getElementById('links-container');
    container.innerHTML = '';

    if (this.data.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);grid-column:1/-1">Nenhum link salvo</div>';
      return;
    }

    this.data.forEach(link => {
      const card = document.createElement('div');
      card.className = 'link-card';

      card.innerHTML = `
        <div class="link-title">${link.title}</div>
        <a href="${link.url}" class="link-url" target="_blank" rel="noopener">${link.url}</a>
        <div class="link-actions">
          <button class="btn-danger" data-id="${link.id}">Excluir</button>
        </div>
      `;

      card.querySelector('.btn-danger').addEventListener('click', () => {
        this.delete(link.id);
      });

      container.appendChild(card);
    });
  },

  updateStats() {
    const el = document.getElementById('stat-links');
    if (el) el.textContent = this.data.length;
  },
};
