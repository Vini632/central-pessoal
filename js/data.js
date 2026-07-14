const Toast = {
  show(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast-visible'));
    setTimeout(() => {
      el.classList.remove('toast-visible');
      el.addEventListener('transitionend', () => el.remove());
    }, duration);
  },
  info(m, d) { this.show(m, 'info', d); },
  success(m, d) { this.show(m, 'success', d); },
  warn(m, d) { this.show(m, 'warn', d); },
  error(m, d) { this.show(m, 'error', d); },
};

const Modal = {
  confirm(msg) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      document.getElementById('modal-title').textContent = 'Confirmação';
      document.getElementById('modal-body').innerHTML = `<p style="color:var(--text-secondary);line-height:1.6">${msg.replace(/</g,'&lt;')}</p>`;
      document.getElementById('modal-confirm').textContent = 'SIM';
      document.getElementById('modal-confirm').style.display = '';
      document.getElementById('modal-cancel').textContent = 'NÃO';
      const close = () => { overlay.classList.add('hidden'); cleanup(); };
      const cleanup = () => {
        document.getElementById('modal-confirm').onclick = null;
        document.getElementById('modal-cancel').onclick = null;
        document.getElementById('modal-close').onclick = null;
        overlay.onclick = null;
      };
      document.getElementById('modal-confirm').onclick = () => { close(); resolve(true); };
      document.getElementById('modal-cancel').onclick = () => { close(); resolve(false); };
      document.getElementById('modal-close').onclick = () => { close(); resolve(false); };
      overlay.onclick = (e) => { if (e.target === overlay) { close(); resolve(false); } };
      overlay.classList.remove('hidden');
    });
  },
  prompt(msg, defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      document.getElementById('modal-title').textContent = msg;
      document.getElementById('modal-body').innerHTML = `<input id="modal-prompt-input" class="settings-select" value="${defaultValue.replace(/"/g,'&quot;')}" style="background-image:none;width:100%">`;
      document.getElementById('modal-confirm').textContent = 'OK';
      document.getElementById('modal-confirm').style.display = '';
      document.getElementById('modal-cancel').textContent = 'CANCELAR';
      const input = document.getElementById('modal-prompt-input');
      setTimeout(() => input?.focus(), 50);
      const close = (val) => { overlay.classList.add('hidden'); cleanup(); resolve(val); };
      const cleanup = () => {
        document.getElementById('modal-confirm').onclick = null;
        document.getElementById('modal-cancel').onclick = null;
        document.getElementById('modal-close').onclick = null;
        overlay.onclick = null;
      };
      document.getElementById('modal-confirm').onclick = () => close(input?.value || '');
      document.getElementById('modal-cancel').onclick = () => close(null);
      document.getElementById('modal-close').onclick = () => close(null);
      overlay.onclick = (e) => { if (e.target === overlay) close(null); };
      input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(input.value); if (e.key === 'Escape') close(null); });
      overlay.classList.remove('hidden');
    });
  },
};


function apiFetch(url, opts = {}) {
  const token = document.querySelector('meta[name="api-token"]')?.content;
  if (token) {
    opts.headers = { ...opts.headers, 'Authorization': `Bearer ${token}` };
  }
  return fetch(url, opts);
}
window.apiFetch = apiFetch;


const Data = {
  cache: {},
  _loaded: false,

  async load() {
    // Collect all localStorage central_* keys first
    const localKeys = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('central_')) {
        try { localKeys[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { console.warn('Data.load: localStorage parse error', e); }
      }
    }

    try {
      const res = await apiFetch('/api/data');
      if (res.ok) {
        this.cache = await res.json();
        // Merge localStorage keys that server doesn't have
        for (const [key, val] of Object.entries(localKeys)) {
          if (this.cache[key] === undefined) {
            this.cache[key] = val;
            // Upload unknown keys to server
            apiFetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [key]: val }),
            }).catch(() => {});
          }
        }
        // Mirror to localStorage
        for (const [key, val] of Object.entries(this.cache)) {
          localStorage.setItem(key, JSON.stringify(val));
        }
        this._loaded = true;
        return;
      }
    } catch (e) { console.warn("data: catch", e); }
    // Fallback: use localStorage
    this.cache = localKeys;
    this._loaded = true;
  },

  async save(key, value) {
    this.cache[key] = value;
    // Always write to localStorage
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn("data: catch", e); }
    // Attempt API sync
    try {
      await apiFetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (e) { console.warn("data: catch", e); }
  },

  get(key) {
    if (this.cache[key] !== undefined) return this.cache[key];
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },

  remove(key) {
    delete this.cache[key];
    try { localStorage.removeItem(key); } catch (e) { console.warn("data: catch", e); }
    apiFetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: null }),
    }).catch(() => {});
  },
};
