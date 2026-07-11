const Data = {
  cache: {},
  _loaded: false,

  async load() {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        this.cache = await res.json();
        // Merge into localStorage as fallback
        for (const [key, val] of Object.entries(this.cache)) {
        localStorage.setItem(key, JSON.stringify(val));
      }
        this._loaded = true;
        return;
      }
    } catch {}
    // Fallback: read from localStorage
    this._loaded = true;
  },

  async save(key, value) {
    this.cache[key] = value;
    // Always write to localStorage
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    // Attempt API sync
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {}
  },

  get(key) {
    if (this.cache[key] !== undefined) return this.cache[key];
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
};
