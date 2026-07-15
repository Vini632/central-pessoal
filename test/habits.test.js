"use strict";
const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

function setupHabits() {
  const Habits = loadModule("js/modules/habits.js");
  Habits.habits = [];
  Habits.logs = [];
  Habits.render = () => {};
  return Habits;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("Habits Module", () => {
  let h;
  before(() => {
    h = setupHabits();
  });

  describe("isDone", () => {
    it("returns 0 when no log exists", () => {
      h.habits = [{ id: "h1", name: "Exercise" }];
      h.logs = [];
      assert.strictEqual(h.isDone("h1", "2024-01-15"), 0);
    });

    it("returns 1 when log exists with done=1", () => {
      h.logs = [{ habitId: "h1", date: "2024-01-15", done: 1 }];
      assert.strictEqual(h.isDone("h1", "2024-01-15"), 1);
    });

    it("returns 0 when log exists with done=0", () => {
      h.logs = [{ habitId: "h1", date: "2024-01-15", done: 0 }];
      assert.strictEqual(h.isDone("h1", "2024-01-15"), 0);
    });

    it("returns 0 for wrong date", () => {
      h.logs = [{ habitId: "h1", date: "2024-01-15", done: 1 }];
      assert.strictEqual(h.isDone("h1", "2024-01-16"), 0);
    });

    it("returns 0 for wrong habit", () => {
      h.logs = [{ habitId: "h1", date: "2024-01-15", done: 1 }];
      assert.strictEqual(h.isDone("h2", "2024-01-15"), 0);
    });
  });

  describe("toggle", () => {
    beforeEach(() => {
      h.habits = [{ id: "h1", name: "Test" }];
      h.logs = [];
    });

    it("creates a log with done=1 when none exists", () => {
      h.toggle("h1", "2024-01-15");
      assert.strictEqual(h.logs.length, 1);
      assert.strictEqual(h.logs[0].habitId, "h1");
      assert.strictEqual(h.logs[0].date, "2024-01-15");
      assert.strictEqual(h.logs[0].done, 1);
    });

    it("toggles existing log from 1 to 0", () => {
      h.logs = [{ habitId: "h1", date: "2024-01-15", done: 1 }];
      h.toggle("h1", "2024-01-15");
      assert.strictEqual(h.logs.length, 1);
      assert.strictEqual(h.logs[0].done, 0);
    });

    it("toggles existing log from 0 to 1", () => {
      h.logs = [{ habitId: "h1", date: "2024-01-15", done: 0 }];
      h.toggle("h1", "2024-01-15");
      assert.strictEqual(h.logs[0].done, 1);
    });
  });

  describe("streak", () => {
    beforeEach(() => {
      h.habits = [{ id: "h1", name: "Test" }];
      h.logs = [];
    });

    it("returns 0 when today is not done", () => {
      h.logs = [{ habitId: "h1", date: daysAgo(1), done: 1 }];
      assert.strictEqual(h.streak("h1"), 0);
    });

    it("counts consecutive days from today", () => {
      const logs = [];
      for (let i = 0; i < 5; i++) {
        logs.push({ habitId: "h1", date: daysAgo(i), done: 1 });
      }
      h.logs = logs;
      assert.strictEqual(h.streak("h1"), 5);
    });

    it("stops counting at first gap", () => {
      const logs = [];
      for (let i = 0; i < 3; i++) logs.push({ habitId: "h1", date: daysAgo(i), done: 1 });
      // skip day 3, add day 4
      logs.push({ habitId: "h1", date: daysAgo(4), done: 1 });
      h.logs = logs;
      assert.strictEqual(h.streak("h1"), 3);
    });

    it("returns 1 when only today is done", () => {
      h.logs = [{ habitId: "h1", date: today(), done: 1 }];
      assert.strictEqual(h.streak("h1"), 1);
    });
  });

  describe("pctDone", () => {
    beforeEach(() => {
      h.habits = [
        { id: "h1", name: "A" },
        { id: "h2", name: "B" },
        { id: "h3", name: "C" },
        { id: "h4", name: "D" },
      ];
      h.logs = [];
    });

    it("returns 0 when no habits exist", () => {
      h.habits = [];
      assert.strictEqual(h.pctDone("2024-01-15"), 0);
    });

    it("returns 0.5 when half are done", () => {
      h.logs = [
        { habitId: "h1", date: "2024-01-15", done: 1 },
        { habitId: "h2", date: "2024-01-15", done: 1 },
      ];
      assert.strictEqual(h.pctDone("2024-01-15"), 0.5);
    });

    it("returns 1 when all are done", () => {
      h.logs = [
        { habitId: "h1", date: "2024-01-15", done: 1 },
        { habitId: "h2", date: "2024-01-15", done: 1 },
        { habitId: "h3", date: "2024-01-15", done: 1 },
        { habitId: "h4", date: "2024-01-15", done: 1 },
      ];
      assert.strictEqual(h.pctDone("2024-01-15"), 1);
    });

    it("returns 0 when none are done", () => {
      assert.strictEqual(h.pctDone("2024-01-15"), 0);
    });
  });

  describe("delete", () => {
    it("removes habit and its logs", () => {
      h.habits = [
        { id: "h1", name: "A" },
        { id: "h2", name: "B" },
      ];
      h.logs = [
        { habitId: "h1", date: "2024-01-15", done: 1 },
        { habitId: "h2", date: "2024-01-15", done: 1 },
      ];
      h.delete("h1");
      assert.strictEqual(h.habits.length, 1);
      assert.strictEqual(h.habits[0].id, "h2");
      assert.strictEqual(h.logs.length, 1);
      assert.strictEqual(h.logs[0].habitId, "h2");
    });

    it("removes habits with no logs safely", () => {
      h.habits = [{ id: "h1", name: "A" }];
      h.logs = [];
      h.delete("h1");
      assert.strictEqual(h.habits.length, 0);
    });
  });

  describe("weekDates", () => {
    it("returns 7 date strings", () => {
      const dates = h.weekDates();
      assert.strictEqual(dates.length, 7);
    });

    it("last element is today", () => {
      const dates = h.weekDates();
      assert.strictEqual(dates[6], today());
    });

    it("first element is 6 days ago", () => {
      const dates = h.weekDates();
      const sixDaysAgo = daysAgo(6);
      assert.strictEqual(dates[0], sixDaysAgo);
    });

    it("dates are consecutive", () => {
      const dates = h.weekDates();
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1] + "T12:00:00");
        const curr = new Date(dates[i] + "T12:00:00");
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        assert.strictEqual(diff, 1, `gap between ${dates[i - 1]} and ${dates[i]}`);
      }
    });
  });

  describe("monthDays", () => {
    it("returns correct number of days for current month", () => {
      const days = h.monthDays();
      const now = new Date();
      const expectedDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      assert.strictEqual(days.length, expectedDays);
    });

    it("all dates are in YYYY-MM-DD format", () => {
      const days = h.monthDays();
      for (const d of days) {
        assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("dates start at 1 and are consecutive", () => {
      const days = h.monthDays();
      assert.strictEqual(days[0].endsWith("-01"), true);
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1] + "T12:00:00");
        const curr = new Date(days[i] + "T12:00:00");
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        assert.strictEqual(diff, 1);
      }
    });
  });

  describe("renderCharts", () => {
    it("returns empty string when no habits exist", () => {
      h.habits = [];
      assert.strictEqual(h.renderCharts(h.weekDates()), "");
    });

    it("returns HTML with chart data when habits exist", () => {
      h.habits = [{ id: "h1", name: "Exercise", icon: "🏋️" }];
      h.logs = [];
      const html = h.renderCharts(h.weekDates());
      assert.ok(html.includes("habits-charts"));
      assert.ok(html.includes("Semana"));
      assert.ok(html.includes("Hoje"));
      assert.ok(html.includes("Melhor"));
    });

    it("shows 0 checks when no habits are done", () => {
      h.habits = [{ id: "h1", name: "Read", icon: "📚" }];
      h.logs = [];
      const html = h.renderCharts(h.weekDates());
      assert.ok(html.includes("0%"));
      assert.ok(html.includes("0/7 checks"));
    });
  });
});
