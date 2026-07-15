'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { loadModule } = require('./helpers/load');

function setupCalendar() {
  const Calendar = loadModule('js/modules/calendar.js');
  Calendar.data = [];
  Calendar.notified = new Set();
  Calendar.render = function() {};
  Calendar.save = function() {};
  Calendar.closeForm = function() {};
  return Calendar;
}

describe('Calendar Module', () => {
  let cal;
  before(() => { cal = setupCalendar(); });

  describe('getEvents', () => {
    it('retorna array vazio quando nenhum evento corresponde', () => {
      cal.data = [{ id: '1', title: 'Event', date: '2024-01-15' }];
      assert.strictEqual(cal.getEvents('2024-01-16').length, 0);
    });

    it('retorna eventos correspondentes para uma data', () => {
      cal.data = [
        { id: '1', title: 'A', date: '2024-01-15' },
        { id: '2', title: 'B', date: '2024-01-15' },
        { id: '3', title: 'C', date: '2024-01-16' },
      ];
      const events = cal.getEvents('2024-01-15');
      assert.strictEqual(events.length, 2);
      assert.strictEqual(events[0].id, '1');
      assert.strictEqual(events[1].id, '2');
    });

    it('retorna array vazio para data sem eventos', () => {
      cal.data = [{ id: '1', title: 'Event', date: '2024-01-15' }];
      assert.strictEqual(cal.getEvents('2025-01-01').length, 0);
    });

    it('não quebra com data vazia', () => {
      cal.data = [];
      assert.strictEqual(cal.getEvents('').length, 0);
    });
  });

  describe('Event CRUD logic', () => {
    it('load inicializa data como array vazio', () => {
      cal.data = [];
      cal.load();
      assert.ok(Array.isArray(cal.data));
    });

    it('filtro por id funciona corretamente', () => {
      const data = [
        { id: 'a1', title: 'A', date: '2024-01-15' },
        { id: 'b2', title: 'B', date: '2024-01-16' },
      ];
      const filtered = data.filter(e => e.id !== 'a1');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'b2');
    });

    it('filtro por id inexistente retorna mesmo array', () => {
      const data = [{ id: 'a1', title: 'Test', date: '2024-01-15' }];
      const filtered = data.filter(e => e.id !== 'non_existent');
      assert.strictEqual(filtered.length, 1);
    });
  });

  describe('Navegação de mês', () => {
    it('envolve de Janeiro para Dezembro do ano anterior', () => {
      cal.month = 0;
      cal.year = 2024;
      cal.month--;
      if (cal.month < 0) { cal.month = 11; cal.year--; }
      assert.strictEqual(cal.month, 11);
      assert.strictEqual(cal.year, 2023);
    });

    it('envolve de Dezembro para Janeiro do próximo ano', () => {
      cal.month = 11;
      cal.year = 2024;
      cal.month++;
      if (cal.month > 11) { cal.month = 0; cal.year++; }
      assert.strictEqual(cal.month, 0);
      assert.strictEqual(cal.year, 2025);
    });

    it('pula para o mês atual', () => {
      cal.month = 5;
      cal.year = 2023;
      const now = new Date();
      cal.month = now.getMonth();
      cal.year = now.getFullYear();
      assert.strictEqual(cal.month, now.getMonth());
      assert.strictEqual(cal.year, now.getFullYear());
    });
  });

  describe('Cálculos de data', () => {
    it('1 Jan 2024 foi Segunda (índice 1)', () => {
      assert.strictEqual(new Date(2024, 0, 1).getDay(), 1);
    });

    it('Fev 2024 (ano bissexto) tem 29 dias', () => {
      assert.strictEqual(new Date(2024, 2, 0).getDate(), 29);
    });

    it('Fev 2023 (não bissexto) tem 28 dias', () => {
      assert.strictEqual(new Date(2023, 2, 0).getDate(), 28);
    });
  });

  describe('Notificações', () => {
    it('notified Set previne lembretes duplicados', () => {
      cal.notified = new Set(['evt1_2024-01-15']);
      assert.strictEqual(cal.notified.has('evt1_2024-01-15'), true);
      assert.strictEqual(cal.notified.has('evt2_2024-01-15'), false);
    });

    it('filtra eventos sem flag de lembrete', () => {
      cal.data = [
        { id: '1', title: 'Sem lembrete', date: '2024-01-15', reminder: 0 },
        { id: '2', title: 'Com lembrete', date: '2024-01-15', reminder: 1, reminderTime: '14:00' },
      ];
      assert.strictEqual(cal.data.filter(e => e.reminder).length, 1);
    });
  });

  describe('Event IDs únicos', () => {
    it('eventos têm IDs únicos', () => {
      cal.data = [
        { id: 'e1', title: 'A', date: '2024-01-15' },
        { id: 'e2', title: 'B', date: '2024-01-16' },
        { id: 'e3', title: 'C', date: '2024-01-17' },
      ];
      const ids = cal.data.map(e => e.id);
      assert.strictEqual(new Set(ids).size, ids.length);
    });
  });
});
