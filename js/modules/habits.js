const Habits = {
  habits: [],
  logs: [],

  init() {
    console.log('Habits.init()');
    this.load();
    this.render();
    const addBtn = document.getElementById('habit-add-btn');
    console.log('habit-add-btn:', addBtn);
    if (addBtn) addBtn.addEventListener('click', () => { console.log('habit-add-btn clicked'); this.create(); });
    const input = document.getElementById('habit-input');
    console.log('habit-input:', input);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { console.log('habit-input enter'); this.create(); }
    });
  },

  load() {
    this.habits = Data.get('central_habits') || [];
    this.logs = Data.get('central_habit_logs') || [];
  },

  save() {
    Data.save('central_habits', this.habits);
    Data.save('central_habit_logs', this.logs);
  },

  create() {
    const input = document.getElementById('habit-input');
    const name = input.value.trim();
    console.log('Habits.create() name:', JSON.stringify(name), 'length:', name.length);
    if (!name) { console.log('Habits.create(): empty, returning'); return; }
    const iconSelect = document.getElementById('habit-icon');
    const habit = {
      id: Date.now().toString(36),
      name,
      icon: iconSelect.value || '○',
      color: '#ffffff',
      sortOrder: this.habits.length,
    };
    console.log('Habits.create(): pushing habit', habit);
    this.habits.push(habit);
    console.log('Habits.create(): saving');
    this.save();
    console.log('Habits.create(): rendering');
    this.render();
    input.value = '';
    input.focus();
    console.log('Habits.create(): done');
  },

  delete(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    this.logs = this.logs.filter(l => l.habitId !== id);
    this.save();
    this.render();
  },

  toggle(habitId, date) {
    const key = `${habitId}_${date}`;
    const existing = this.logs.find(l => l.habitId === habitId && l.date === date);
    if (existing) {
      existing.done = existing.done ? 0 : 1;
    } else {
      this.logs.push({ habitId, date, done: 1 });
    }
    this.save();
    this.render();
  },

  isDone(habitId, date) {
    const log = this.logs.find(l => l.habitId === habitId && l.date === date);
    return log ? log.done : 0;
  },

  streak(habitId) {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (this.isDone(habitId, dateStr)) count++;
      else if (i > 0) break;
      if (i === 0 && !this.isDone(habitId, dateStr)) return 0;
    }
    return count;
  },

  weekDates() {
    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  },

  monthDays() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push(dateStr);
    }
    return result;
  },

  pctDone(dateStr) {
    if (!this.habits.length) return 0;
    const done = this.habits.filter(h => this.isDone(h.id, dateStr)).length;
    return done / this.habits.length;
  },

  render() {
    const container = document.getElementById('habits-container');
    const today = new Date().toISOString().slice(0, 10);
    const week = this.weekDates();
    const month = this.monthDays();

    if (this.habits.length === 0) {
      container.innerHTML = '<div class="habits-empty">Nenhum hábito ainda</div>';
      return;
    }

    const weekDays = week.map(d => {
      const dt = new Date(d + 'T12:00:00');
      return { date: d, label: dt.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3), day: dt.getDate() };
    });

    container.innerHTML = `
      <div class="habits-header-row">
        <span class="habits-h-name">Hábito</span>
        ${weekDays.map(w => `<span class="habits-h-day ${w.date === today ? 'today' : ''}">${w.label}<br><span class="habits-h-num">${w.day}</span></span>`).join('')}
        <span class="habits-h-streak">Sequência</span>
        <span class="habits-h-del"></span>
      </div>
      ${this.habits.map(h => `
        <div class="habits-row" data-id="${h.id}">
          <span class="habits-r-name"><span class="habits-icon">${h.icon}</span> ${h.name.replace(/</g, '&lt;')}</span>
          ${week.map(w => `
            <button class="habits-check ${this.isDone(h.id, w) ? 'done' : ''}" data-habit="${h.id}" data-date="${w}">${this.isDone(h.id, w) ? '✓' : ''}</button>
          `).join('')}
          <span class="habits-streak">${this.streak(h.id)}</span>
          <button class="habits-del" data-id="${h.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('')}
      <div class="habits-heatmap">
        <div class="habits-heatmap-title">Mês</div>
        <div class="habits-heatmap-grid">
          ${month.map((d, i) => {
            const pct = this.pctDone(d);
            const intensity = Math.round(pct * 100);
            const isToday = d === today;
            return `<div class="habits-heatmap-cell ${isToday ? 'today' : ''}" style="opacity:${0.15 + intensity * 0.008}" title="${d}: ${Math.round(pct * 100)}%">
              <span class="habits-heatmap-day">${i + 1}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="habits-heatmap-legend">
          <span>0%</span>
          <span class="habits-hl-bar"><span style="opacity:0.15">■</span><span style="opacity:0.3">■</span><span style="opacity:0.5">■</span><span style="opacity:0.7">■</span><span style="opacity:1">■</span></span>
          <span>100%</span>
        </div>
      </div>
      ${this.renderCharts(week)}
    `;

    container.querySelectorAll('.habits-check').forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggle(btn.dataset.habit, btn.dataset.date);
      });
    });

    container.querySelectorAll('.habits-del').forEach(btn => {
      btn.addEventListener('click', () => {
        this.delete(btn.dataset.id);
      });
    });
  },

  renderCharts(week) {
    if (!this.habits.length) return '';
    const totalChecks = this.habits.reduce((sum, h) => sum + week.filter(w => this.isDone(h.id, w)).length, 0);
    const maxPossible = this.habits.length * week.length;
    const pct = maxPossible ? Math.round(totalChecks / maxPossible * 100) : 0;
    const bestHabit = this.habits.map(h => ({ name: h.name, icon: h.icon, count: week.filter(w => this.isDone(h.id, w)).length }))
      .sort((a, b) => b.count - a.count)[0];
    const totalToday = this.habits.filter(h => this.isDone(h.id, new Date().toISOString().slice(0, 10))).length;

    const barData = week.map(d => {
      const done = this.habits.filter(h => this.isDone(h.id, d)).length;
      return { date: d, done, total: this.habits.length, pct: this.habits.length ? done / this.habits.length : 0 };
    });
    const maxBar = Math.max(1, ...barData.map(b => b.done));

    return `
      <div id="habits-charts">
        <div class="habits-chart-row">
          <div class="habits-chart-box">
            <h4>Semana</h4>
            <div class="big-number">${pct}%</div>
            <div class="sub-text">${totalChecks}/${maxPossible} checks</div>
          </div>
          <div class="habits-chart-box">
            <h4>Hoje</h4>
            <div class="big-number">${totalToday}</div>
            <div class="sub-text">de ${this.habits.length} hábitos</div>
          </div>
          <div class="habits-chart-box">
            <h4>Melhor</h4>
            <div class="big-number">${bestHabit ? bestHabit.icon : '—'}</div>
            <div class="sub-text">${bestHabit ? bestHabit.name + ' (' + bestHabit.count + ')' : '—'}</div>
          </div>
        </div>
        <div class="habits-chart-box" style="text-align:left">
          <h4>Últimos 7 dias</h4>
          <div class="habits-bar">
            ${barData.map(b => `<div class="habits-bar-item ${b.pct > 0.6 ? 'high' : b.pct > 0.3 ? 'medium' : 'low'}" style="height:${Math.max(2, b.pct * 60)}px" title="${b.date}: ${b.done}/${b.total}"></div>`).join('')}
          </div>
          <div class="habits-bar-labels">
            ${barData.map(b => {
              const dt = new Date(b.date + 'T12:00:00');
              return `<span>${dt.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 2)}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },
};
