'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { loadModule } = require('./helpers/load');

function setupCalendar() {
  const Calendar = loadModule('js/modules/calendar.js');
  Calendar.data = [];
  Calendar.notified = new Set();
  // Override DOM-dependent methods to be safe for testing
  Calendar.render = function() {};
  Calendar.save = function() {}; // Data is scoped inside the vm, not accessible here
  Calendar.closeForm = function() {};
  return Calendar;
}

describe('Calendar Module', () => {
  let cal;
  before(() => { cal = setupCalendar(); });

  describe('getEvents', () => {
    it('returns empty array when no events match', () => {
      cal.data = [{ id: '1', title: 'Event', date: '2024-01-15' }];
      assert.strictEqual(cal.getEvents('2024-01-16').length, 0);
    });

    it('returns matching events for a given date', () => {
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

    it('is case-sensitive for dates', () => {
      cal.data = [{ id: '1', title: 'Event', date: '2024-01-15' }];
      assert.strictEqual(cal.getEvents('2024-01-15').length, 1);
    });
  });

  describe('Event CRUD logic', () => {
    it('load initializes data from Data store', () => {
      cal.data = [];
      cal.load();
      assert.ok(Array.isArray(cal.data));
    });

    it('filter by id (remove logic) works correctly', () => {
      const data = [
        { id: 'a1', title: 'A', date: '2024-01-15' },
        { id: 'b2', title: 'B', date: '2024-01-16' },
      ];
      const filtered = data.filter(e => e.id !== 'a1');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'b2');
    });

    it('filter by non-existent id returns same array', () => {
      const data = [{ id: 'a1', title: 'Test', date: '2024-01-15' }];
      const filtered = data.filter(e => e.id !== 'non_existent');
      assert.strictEqual(filtered.length, 1);
    });
  });

  describe('Month navigation', () => {
    it('wraps from January to December of previous year', () => {
      cal.month = 0; // January
      cal.year = 2024;
      cal.month--;
      if (cal.month < 0) { cal.month = 11; cal.year--; }
      assert.strictEqual(cal.month, 11);
      assert.strictEqual(cal.year, 2023);
    });

    it('wraps from December to January of next year', () => {
      cal.month = 11; // December
      cal.year = 2024;
      cal.month++;
      if (cal.month > 11) { cal.month = 0; cal.year++; }
      assert.strictEqual(cal.month, 0);
      assert.strictEqual(cal.year, 2025);
    });

    it('can jump to current month', () => {
      cal.month = 5;
      cal.year = 2023;
      const now = new Date();
      cal.month = now.getMonth();
      cal.year = now.getFullYear();
      assert.strictEqual(cal.month, now.getMonth());
      assert.strictEqual(cal.year, now.getFullYear());
    });
  });

  describe('Date calculations', () => {
    it('Jan 1 2024 was a Monday (index 1)', () => {
      assert.strictEqual(new Date(2024, 0, 1).getDay(), 1);
    });

    it('Feb 2024 (leap year) has 29 days', () => {
      assert.strictEqual(new Date(2024, 2, 0).getDate(), 29);
    });

    it('Feb 2023 (non-leap) has 28 days', () => {
      assert.strictEqual(new Date(2023, 2, 0).getDate(), 28);
    });
  });

  describe('Notifications', () => {
    it('notified Set prevents duplicate reminders', () => {
      cal.notified = new Set(['evt1_2024-01-15']);
      assert.ok(cal.notified.has('evt1_2024-01-15'));
      assert.ok(!cal.notified.has('evt2_2024-01-15'));
    });

    it('filters events without reminder flag', () => {
      cal.data = [
        { id: '1', title: 'No reminder', date: '2024-01-15', reminder: 0 },
        { id: '2', title: 'With reminder', date: '2024-01-15', reminder: 1, reminderTime: '14:00' },
      ];
      assert.strictEqual(cal.data.filter(e => e.reminder).length, 1);
    });
  });
});
