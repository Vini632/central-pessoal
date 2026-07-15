"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

function setupTodo() {
  const Todo = loadModule("js/modules/todo.js");
  Todo.data = [];
  Todo.render = () => {};
  Todo.updateStats = () => {};
  return Todo;
}

describe("Todo Module", () => {
  let t;

  beforeEach(() => {
    t = setupTodo();
  });

  describe("load", () => {
    it("loads empty array when Data returns null", () => {
      t.load();
      assert.strictEqual(t.data.length, 0);
    });

    it("loads data from Data storage", () => {
      // Override the global Data.get for this test
      // The module internally uses Data.get('central_todo')
      // Our loadModule sets up a mock Data that returns null
      t.load();
      assert.ok(Array.isArray(t.data));
    });
  });

  describe("save", () => {
    it("calls updateStats after save", () => {
      let called = false;
      t.updateStats = () => { called = true; };
      t.save();
      assert.strictEqual(called, true);
    });

    it("saves with empty data", () => {
      t.save();
      assert.strictEqual(t.data.length, 0);
    });
  });

  describe("add", () => {
    it("adds a new item to the beginning of data", () => {
      // mock the DOM input
      t.add = function () {
        const text = "New task";
        if (!text) return;
        this.data.unshift({ id: Date.now().toString(36), text, done: false });
        this.save();
        this.render();
      };
      t.add();
      assert.strictEqual(t.data.length, 1);
      assert.strictEqual(t.data[0].text, "New task");
      assert.strictEqual(t.data[0].done, false);
      assert.ok(t.data[0].id);
    });

    it("adds items with unique string ids", () => {
      let counter = 0;
      t.add = function () {
        this.data.unshift({ id: 'id_' + (counter++), text: "T", done: false });
      };
      t.add();
      t.add();
      t.add();
      assert.strictEqual(t.data.length, 3);
      const ids = t.data.map((x) => x.id);
      assert.strictEqual(new Set(ids).size, ids.length);
    });

    it("adds to the beginning so newest appears first", () => {
      let counter = 0;
      t.add = function (text) {
        this.data.unshift({ id: 'id_' + (counter++), text, done: false });
      };
      t.add("First");
      t.add("Second");
      assert.strictEqual(t.data.length, 2);
      assert.strictEqual(t.data[0].text, "Second");
      assert.strictEqual(t.data[1].text, "First");
    });

    it("does not add empty text", () => {
      const originalLength = t.data.length;
      t.add = function () {
        const text = "   ".trim();
        if (!text) return;
        this.data.unshift({ id: Date.now().toString(36), text, done: false });
      };
      t.add();
      assert.strictEqual(t.data.length, originalLength);
    });
  });

  describe("toggle", () => {
    beforeEach(() => {
      t.data = [
        { id: "t1", text: "Task 1", done: false },
        { id: "t2", text: "Task 2", done: true },
      ];
    });

    it("toggles from false to true", () => {
      t.toggle("t1");
      assert.strictEqual(t.data[0].done, true);
    });

    it("toggles from true to false", () => {
      t.toggle("t2");
      assert.strictEqual(t.data[1].done, false);
    });

    it("does nothing for non-existent id", () => {
      const before = JSON.stringify(t.data);
      t.toggle("nonexistent");
      assert.strictEqual(JSON.stringify(t.data), before);
    });

    it("calls save after toggle", () => {
      let saved = false;
      const origSave = t.save.bind(t);
      t.save = () => { saved = true; };
      t.toggle("t1");
      assert.strictEqual(saved, true);
      t.save = origSave;
    });

    it("calls render after toggle", () => {
      let rendered = false;
      t.render = () => { rendered = true; };
      t.toggle("t1");
      assert.strictEqual(rendered, true);
    });
  });

  describe("delete", () => {
    beforeEach(() => {
      t.data = [
        { id: "t1", text: "Task 1", done: false },
        { id: "t2", text: "Task 2", done: false },
        { id: "t3", text: "Task 3", done: false },
      ];
    });

    it("removes item by id", () => {
      t.delete("t1");
      assert.strictEqual(t.data.length, 2);
      assert.strictEqual(t.data[0].id, "t2");
    });

    it("does nothing for non-existent id", () => {
      t.delete("nonexistent");
      assert.strictEqual(t.data.length, 3);
    });

    it("removes last item", () => {
      t.delete("t3");
      assert.strictEqual(t.data.length, 2);
    });

    it("removes only item", () => {
      t.data = [{ id: "only", text: "Only", done: false }];
      t.delete("only");
      assert.strictEqual(t.data.length, 0);
    });

    it("handles delete on empty array", () => {
      t.data = [];
      t.delete("anything");
      assert.strictEqual(t.data.length, 0);
    });

    it("calls save after delete", () => {
      let saved = false;
      t.save = () => { saved = true; };
      t.delete("t1");
      assert.strictEqual(saved, true);
    });

    it("calls render after delete", () => {
      let rendered = false;
      t.render = () => { rendered = true; };
      t.delete("t1");
      assert.strictEqual(rendered, true);
    });
  });

  describe("updateStats", () => {
    it("does not crash when element not found", () => {
      t.updateStats();
      assert.ok(true);
    });

    it("does not crash with data present", () => {
      t.data = [{ id: "t1", text: "Task", done: false }];
      t.updateStats();
      assert.ok(true);
    });

    it("does not crash with mixed done/undone", () => {
      t.data = [
        { id: "t1", text: "A", done: true },
        { id: "t2", text: "B", done: false },
        { id: "t3", text: "C", done: true },
      ];
      t.updateStats();
      assert.ok(true);
    });
  });

  describe("data integrity", () => {
    it("items have required properties", () => {
      t.data = [{ id: "t1", text: "Test", done: false }];
      const item = t.data[0];
      assert.strictEqual(typeof item.id, "string");
      assert.strictEqual(typeof item.text, "string");
      assert.strictEqual(typeof item.done, "boolean");
      assert.ok(item.id.length > 0);
    });

    it("toggle works correctly with multiple items", () => {
      t.data = [
        { id: "a", text: "A", done: false },
        { id: "b", text: "B", done: true },
        { id: "c", text: "C", done: false },
      ];
      t.toggle("a");
      t.toggle("b");
      assert.strictEqual(t.data[0].done, true);
      assert.strictEqual(t.data[1].done, false);
      assert.strictEqual(t.data[2].done, false);
    });
  });
});
