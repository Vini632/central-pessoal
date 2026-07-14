const Calendar = {
  data: [],
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  notified: new Set(),
  checkTimer: null,

  init() {
    this.load();
    this.render();

    // Carregar lembretes já notificados hoje
    try {
      const raw = localStorage.getItem('central_notified');
      if (raw) this.notified = new Set(JSON.parse(raw));
    } catch (e) { console.warn("calendar: catch", e); }

    // Pedir permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Verificar lembretes a cada 30 segundos
    this.checkTimer = setInterval(() => this.checkReminders(), 30000);
    this.checkReminders();

    document.getElementById('cal-prev').addEventListener('click', () => {
      this.month--;
      if (this.month < 0) { this.month = 11; this.year--; }
      this.render();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      this.month++;
      if (this.month > 11) { this.month = 0; this.year++; }
      this.render();
    });
    document.getElementById('cal-today').addEventListener('click', () => {
      this.month = new Date().getMonth();
      this.year = new Date().getFullYear();
      this.render();
    });
  },

  checkReminders() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentMin = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    for (const ev of this.data) {
      if (!ev.reminder || !ev.reminderTime || ev.date !== today) continue;

      const key = ev.id + '_' + today;
      if (this.notified.has(key)) continue;

      if (ev.reminderTime === currentMin) {
        this.notified.add(key);
        try { Data.save('central_notified', [...this.notified]); } catch (e) { console.warn("calendar: catch", e); }

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Lembrete: ' + ev.title, {
            body: ev.description || ev.location || ev.startTime || '',
            icon: '/favicon.svg',
          });
        }
      }
    }
  },

  load() {
    this.data = Data.get('central_events') || [];
  },

  save() {
    Data.save('central_events', this.data);
  },

  getEvents(dateStr) {
    return this.data.filter(e => e.date === dateStr);
  },

  openForm(dateStr, event) {
    const isEdit = !!event;
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = isEdit ? 'Editar Evento' : 'Novo Evento';
    document.getElementById('modal-cancel').textContent = 'CANCELAR';
    document.getElementById('modal-confirm').textContent = isEdit ? 'SALVAR' : 'CRIAR';

    document.getElementById('modal-body').innerHTML = `
      <div class="cal-form">
        <input id="ev-title" class="cal-input" placeholder="Titulo" value="${isEdit ? event.title.replace(/"/g, '&quot;') : ''}" autofocus>
        <div class="cal-form-row">
          <input id="ev-start" class="cal-input cal-input-half" type="time" placeholder="Inicio" value="${isEdit && event.startTime ? event.startTime : ''}">
          <input id="ev-end" class="cal-input cal-input-half" type="time" placeholder="Fim" value="${isEdit && event.endTime ? event.endTime : ''}">
        </div>
        <div class="cal-form-row">
          <span class="cal-form-label">ate</span>
        </div>
        <input id="ev-location" class="cal-input" placeholder="Local" value="${isEdit ? event.location?.replace(/"/g, '&quot;') || '' : ''}">
        <textarea id="ev-desc" class="cal-input cal-textarea" placeholder="Descricao">${isEdit ? event.description?.replace(/</g, '&lt;') || '' : ''}</textarea>
        <div class="cal-form-row" style="margin-top:8px">
          <label class="cal-form-check">
            <input type="checkbox" id="ev-reminder" ${isEdit && event.reminder ? 'checked' : ''}>
            <span>Lembrete</span>
          </label>
          <input id="ev-reminder-time" class="cal-input" type="time" value="${isEdit && event.reminderTime ? event.reminderTime : ''}" style="max-width:140px">
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');

    const save = () => {
      const title = document.getElementById('ev-title').value.trim();
      if (!title) return;

      const ev = {
        id: isEdit ? event.id : Date.now().toString(36),
        title,
        startTime: document.getElementById('ev-start').value || '',
        endTime: document.getElementById('ev-end').value || '',
        location: document.getElementById('ev-location').value.trim(),
        description: document.getElementById('ev-desc').value.trim(),
        date: dateStr,
        reminder: document.getElementById('ev-reminder').checked ? 1 : 0,
        reminderTime: document.getElementById('ev-reminder-time').value || '',
      };

      if (isEdit) {
        Object.assign(event, ev);
      } else {
        this.data.push(ev);
      }
      this.save();
      this.render();
      this.closeForm();
    };

    const close = () => this.closeForm();

    document.getElementById('modal-confirm').onclick = save;
    document.getElementById('modal-cancel').onclick = close;
    document.getElementById('modal-close').onclick = close;

    const keyHandler = (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') save();
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', keyHandler);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    this._cleanup = () => document.removeEventListener('keydown', keyHandler);
  },

  openView(dateStr, event) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = event.title;
    document.getElementById('modal-cancel').textContent = 'EXCLUIR';
    document.getElementById('modal-confirm').textContent = 'EDITAR';

    const timeStr = [event.startTime, event.endTime].filter(Boolean).join(' ate ');
    const locStr = event.location ? `<div class="cal-view-row"><span class="cal-view-label">Local</span><span>${event.location}</span></div>` : '';
    const descStr = event.description ? `<div class="cal-view-row"><span class="cal-view-label">Descricao</span><span>${event.description.replace(/</g, '&lt;')}</span></div>` : '';
    const reminderStr = event.reminder ? `<div class="cal-view-row"><span class="cal-view-label">Lembrete</span><span>🔔 ${event.reminderTime || 'Horario do evento'}</span></div>` : '';

    document.getElementById('modal-body').innerHTML = `
      <div class="cal-view">
        <div class="cal-view-date">${new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        ${timeStr ? `<div class="cal-view-row"><span class="cal-view-label">Horario</span><span>${timeStr}</span></div>` : ''}
        ${locStr}
        ${descStr}
        ${reminderStr}
      </div>
    `;

    overlay.classList.remove('hidden');

    document.getElementById('modal-confirm').onclick = () => {
      this.closeForm();
      setTimeout(() => this.openForm(dateStr, event), 100);
    };
    document.getElementById('modal-cancel').onclick = async () => {
      if (await Modal.confirm(`Remover "${event.title}"?`)) {
        this.remove(event.id);
        this.closeForm();
      }
    };
    document.getElementById('modal-close').onclick = () => this.closeForm();

    const keyHandler = (e) => {
      if (e.key === 'Escape') this.closeForm();
    };
    document.addEventListener('keydown', keyHandler);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeForm();
    });
    this._cleanup = () => document.removeEventListener('keydown', keyHandler);
  },

  closeForm() {
    document.getElementById('modal-overlay').classList.add('hidden');
    if (this._cleanup) this._cleanup();
  },

  remove(id) {
    this.data = this.data.filter(e => e.id !== id);
    this.save();
    this.render();
  },

  render() {
    const grid = document.getElementById('cal-grid');
    const title = document.getElementById('cal-title');
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const firstDay = new Date(this.year, this.month, 1).getDay();
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    title.textContent = `${months[this.month]} ${this.year}`;

    grid.innerHTML = '';

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    weekdays.forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-weekday';
      el.textContent = d;
      grid.appendChild(el);
    });

    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day cal-empty';
      grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const events = this.getEvents(dateStr);
      const hasReminder = events.some(e => e.reminder);

      const el = document.createElement('div');
      el.className = `cal-day${isToday ? ' cal-today' : ''}${hasReminder ? ' cal-has-reminder' : ''}`;
      el.innerHTML = `<span class="cal-day-num">${d}${hasReminder ? '<span class="cal-reminder-dot">🔔</span>' : ''}</span>`;

      if (events.length) {
        const list = document.createElement('div');
        list.className = 'cal-events';
        events.slice(0, 3).forEach(ev => {
          const evEl = document.createElement('div');
          evEl.className = 'cal-event';
          if (ev.reminder) evEl.classList.add('cal-event-reminder');
          const timeLabel = ev.startTime ? ev.startTime + (ev.endTime ? '-' + ev.endTime : '') + ' ' : '';
          const reminderIcon = ev.reminder ? '<span class="cal-event-reminder-icon">🔔</span>' : '';
          evEl.innerHTML = `<span class="cal-event-time">${timeLabel}</span>${reminderIcon}<span class="cal-event-title">${ev.title.replace(/</g, '&lt;')}</span>`;
          evEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openView(dateStr, ev);
          });
          list.appendChild(evEl);
        });
        if (events.length > 3) {
          const more = document.createElement('div');
          more.className = 'cal-event cal-more';
          more.textContent = `+${events.length - 3} mais`;
          list.appendChild(more);
        }
        el.appendChild(list);
      }

      el.addEventListener('click', () => this.openForm(dateStr, null));
      grid.appendChild(el);
    }
  },
};
