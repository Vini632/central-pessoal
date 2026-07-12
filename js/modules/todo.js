const Todo = {
  data: [],

  init() {
    console.log('Todo.init()');
    this.load();
    this.render();
    const addBtn = document.getElementById('todo-add-btn');
    console.log('todo-add-btn:', addBtn);
    if (addBtn) addBtn.addEventListener('click', () => { console.log('todo-add-btn clicked'); this.add(); });
    const input = document.getElementById('todo-input');
    console.log('todo-input:', input);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { console.log('todo-input enter'); this.add(); }
    });
    const voiceBtn = document.getElementById('todo-voice-btn');
    console.log('todo-voice-btn:', voiceBtn);
    if (voiceBtn) voiceBtn.addEventListener('click', function() {
      const input = document.getElementById('todo-input');
      if (Voice.recognition) Voice.stop(this);
      else Voice.start(input, this);
    });
  },

  load() {
    this.data = Data.get('central_todo') || [];
  },

  save() {
    Data.save('central_todo', this.data);
    this.updateStats();
  },

  add() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;
    this.data.unshift({ id: Date.now().toString(36), text, done: false });
    input.value = '';
    this.save();
    this.render();
  },

  toggle(id) {
    const item = this.data.find(t => t.id === id);
    if (item) { item.done = !item.done; this.save(); this.render(); }
  },

  delete(id) {
    this.data = this.data.filter(t => t.id !== id);
    this.save();
    this.render();
  },

  render() {
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    if (this.data.length === 0) {
      list.innerHTML = '<div class="todo-empty">Nenhuma tarefa ainda</div>';
      return;
    }
    this.data.forEach(item => {
      const el = document.createElement('div');
      el.className = 'todo-item' + (item.done ? ' done' : '');
      el.innerHTML = `
        <label class="todo-check">
          <input type="checkbox" ${item.done ? 'checked' : ''}>
          <span class="todo-checkmark"></span>
        </label>
        <span class="todo-text">${item.text.replace(/</g, '&lt;')}</span>
        <button class="todo-del" data-id="${item.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      el.querySelector('input').addEventListener('change', () => this.toggle(item.id));
      el.querySelector('.todo-del').addEventListener('click', () => this.delete(item.id));
      list.appendChild(el);
    });
  },

  updateStats() {
    const total = this.data.length;
    const done = this.data.filter(t => t.done).length;
    const el = document.getElementById('stat-todo');
    if (el) el.textContent = total;
  },
};
