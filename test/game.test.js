'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadModule } = require('./helpers/load');

function setupGame(type = 'ferreiro', overrides = {}) {
  const mockEl = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {} },
    dataset: {},
  };
  const Game = loadModule('js/modules/game.js', {
    document: {
      getElementById: (id) => id === 'mod-game' || id === 'modal-overlay' ? mockEl : null,
      createElement: () => ({
        tagName: 'DIV',
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        setAttribute: () => {},
        getAttribute: () => null,
        focus: () => {},
        scrollIntoView: () => {},
      }),
      body: { appendChild: () => {} },
      head: { appendChild: () => {} },
      querySelector: () => null,
      querySelectorAll: () => [],
      createTextNode: () => ({}),
    },
  });
  Game.startNew(type);
  Object.assign(Game.state, overrides);
  return Game;
}

describe('Game Module', () => {
  describe('formatMoney', () => {
    it('formats positive numbers', () => {
      const g = setupGame();
      assert.strictEqual(g.formatMoney(0), '$0');
      assert.strictEqual(g.formatMoney(50), '$50');
      assert.strictEqual(g.formatMoney(999), '$999');
    });

    it('formats negative numbers', () => {
      const g = setupGame();
      assert.strictEqual(g.formatMoney(-5), '$-5');
    });
  });

  describe('timeStr', () => {
    it('formats hour with leading zero', () => {
      const g = setupGame();
      g.state.hour = 8;
      assert.strictEqual(g.timeStr(), '08:00');
      g.state.hour = 23;
      assert.strictEqual(g.timeStr(), '23:00');
      g.state.hour = 0;
      assert.strictEqual(g.timeStr(), '00:00');
    });
  });

  describe('addXp', () => {
    it('levels up when XP threshold is reached', () => {
      const g = setupGame();
      assert.strictEqual(g.state.level, 1);
      assert.strictEqual(g.state.xp, 0);
      g.addXp(15);
      assert.strictEqual(g.state.level, 1);
      assert.strictEqual(g.state.xp, 15);
      g.addXp(10);
      assert.strictEqual(g.state.level, 2);
      assert.strictEqual(g.state.xp, 5);
      assert.strictEqual(g.state.maxEnergy, 12);
    });

    it('only levels up once per call', () => {
      const g = setupGame();
      g.addXp(100);
      assert.strictEqual(g.state.level, 2);
      assert.strictEqual(g.state.xp, 80);
    });

    it('does not level up with zero xp', () => {
      const g = setupGame();
      g.addXp(0);
      assert.strictEqual(g.state.level, 1);
      assert.strictEqual(g.state.xp, 0);
    });
  });

  describe('getLevelMod', () => {
    it('returns 1.0 at level 1', () => {
      const g = setupGame();
      g.state.level = 1;
      assert.strictEqual(g.getLevelMod(), 1.0);
    });
    it('increases by 0.1 per level above 1', () => {
      const g = setupGame();
      g.state.level = 5;
      assert.strictEqual(g.getLevelMod(), 1.4);
      g.state.level = 10;
      assert.strictEqual(g.getLevelMod(), 1.9);
    });
  });

  describe('getPrice', () => {
    it('returns base price at default state', () => {
      const g = setupGame();
      const recipe = g.data.ferreiro.recipes.find(r => r.id === 'adaga');
      assert.strictEqual(g.getPrice(recipe), 18);
    });

    it('increases with higher satisfaction', () => {
      const g = setupGame();
      const recipe = g.data.ferreiro.recipes.find(r => r.id === 'adaga');
      g.state.satisfaction = 100;
      assert.strictEqual(g.getPrice(recipe), 23);
    });

    it('decreases with low satisfaction', () => {
      const g = setupGame();
      const recipe = g.data.ferreiro.recipes.find(r => r.id === 'adaga');
      g.state.satisfaction = 0;
      assert.strictEqual(g.getPrice(recipe), 14);
    });

    it('applies vitrine upgrade bonus (20%)', () => {
      const g = setupGame();
      const recipe = g.data.ferreiro.recipes.find(r => r.id === 'adaga');
      g.state.upgrades = ['vitrine'];
      assert.strictEqual(g.getPrice(recipe), Math.round(18 * 1.2));
    });
  });

  describe('getCustomerCount', () => {
    it('returns 3 base at noon with 0 reputation', () => {
      const g = setupGame();
      g.state.reputation = 0;
      g.state.hour = 12;
      assert.strictEqual(g.getCustomerCount(), 3);
    });

    it('increases with reputation', () => {
      const g = setupGame();
      g.state.reputation = 50;
      assert.ok(g.getCustomerCount() >= 3);
    });

    it('reduces during off-hours', () => {
      const g = setupGame();
      g.state.hour = 4;
      assert.ok(g.getCustomerCount() <= 3);
    });

    it('returns at least 0 (never negative)', () => {
      const g = setupGame();
      g.state.reputation = -100;
      g.state.hour = 23;
      const count = g.getCustomerCount();
      assert.ok(count >= 0, `count should be >= 0, got ${count}`);
    });
  });

  describe('Data integrity', () => {
    it('all recipe materials reference valid materials', () => {
      const g = setupGame();
      for (const [type, cfg] of Object.entries(g.data)) {
        for (const recipe of cfg.recipes) {
          for (const matKey of Object.keys(recipe.cost)) {
            assert.ok(cfg.materials[matKey],
              `Recipe "${recipe.id}" in "${type}" references unknown material "${matKey}"`);
          }
        }
      }
    });

    it('all employees have unique IDs', () => {
      const g = setupGame();
      for (const cfg of Object.values(g.data)) {
        const ids = cfg.employees.map(e => e.id);
        assert.strictEqual(new Set(ids).size, ids.length, 'duplicate employee IDs');
      }
    });

    it('all upgrades have unique IDs', () => {
      const g = setupGame();
      for (const cfg of Object.values(g.data)) {
        const ids = cfg.upgrades.map(u => u.id);
        assert.strictEqual(new Set(ids).size, ids.length, 'duplicate upgrade IDs');
      }
    });

    it('new game starts with correct initial values', () => {
      const g = setupGame();
      assert.strictEqual(g.state.money, 30);
      assert.strictEqual(g.state.level, 1);
      assert.strictEqual(g.state.energy, 10);
      assert.strictEqual(g.state.hour, 8);
      assert.strictEqual(g.state.inventory.ferro, 4);
    });
  });

  describe('checkEndOfDay', () => {
    it('resets hour to 0 and increments day at midnight', () => {
      const g = setupGame();
      g.state.hour = 23;
      g.checkEndOfDay();
      assert.strictEqual(g.state.hour, 23);
      g.state.hour = 24;
      g.checkEndOfDay();
      assert.strictEqual(g.state.hour, 0);
      assert.strictEqual(g.state.day, 2);
    });

    it('does not change day when hour < 24', () => {
      const g = setupGame();
      g.state.hour = 15;
      g.state.day = 1;
      g.checkEndOfDay();
      assert.strictEqual(g.state.hour, 15);
      assert.strictEqual(g.state.day, 1);
    });
  });

  describe('doAction', () => {
    it('advance increments hour by 1', async () => {
      const g = setupGame();
      g.state.hour = 10;
      await g.doAction('advance');
      assert.strictEqual(g.state.hour, 11);
    });

    it('advance wraps to next day at midnight', async () => {
      const g = setupGame();
      g.state.hour = 23;
      await g.doAction('advance');
      assert.strictEqual(g.state.hour, 0);
      assert.strictEqual(g.state.day, 2);
    });
  });

  describe('randomEvent', () => {
    it('does not crash and updates state', () => {
      const g = setupGame();
      const beforeMoney = g.state.money;
      g.randomEvent();
      assert.strictEqual(typeof g.state.money, 'number');
      assert.ok(g.state.log.length > 1);
    });
  });


});
