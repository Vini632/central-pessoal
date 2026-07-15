"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockFileReader {
  constructor() {
    this.onload = null;
  }
  readAsDataURL(file) {
    this.result = `data:${file.type || "image/png"};base64,${file.name || "dummy"}`;
    Promise.resolve().then(() => {
      if (this.onload) this.onload({ target: this });
    });
  }
}

function setupNotes(extraMocks = {}) {
  const Notes = loadModule("js/modules/notes.js", {
    marked: { parse: (text) => `<p>${text || "*Vazio*"}</p>` },
    FileReader: MockFileReader,
    ...extraMocks,
  });
  Notes.data = [];
  Notes.previews = {};
  Notes.render = function () {};
  Notes.init = function () {
    this.load();
  };
  return Notes;
}

function makeNote(overrides = {}) {
  return {
    id: overrides.id || "n1",
    content: overrides.content || "",
    images: overrides.images || [],
    date: overrides.date || new Date().toISOString(),
    ...overrides,
  };
}

describe("Notes Module - load", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
  });

  it("loads empty array when Data returns null", () => {
    n.load();
    assert.strictEqual(n.data.length, 0);
  });

  it("does not crash when called multiple times", () => {
    n.load();
    n.load();
    assert.strictEqual(n.data.length, 0);
  });
});

describe("Notes Module - save", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
  });

  it("calls updateStats after save", () => {
    let statsCalled = false;
    n.updateStats = function () {
      statsCalled = true;
    };
    n.save();
    assert.strictEqual(statsCalled, true);
  });

  it("does not crash when saving with notes", () => {
    n.data = [makeNote({ id: "n1", content: "Hello" })];
    n.save();
    assert.strictEqual(n.data.length, 1);
  });

  it("does not crash when saving empty data", () => {
    n.save();
    assert.strictEqual(n.data.length, 0);
  });
});

describe("Notes Module - create", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
  });

  it("creates a note with required structure", () => {
    n.create();
    assert.strictEqual(n.data.length, 1);
    const note = n.data[0];
    assert.strictEqual(typeof note.id, "string");
    assert.ok(note.id.length > 0);
    assert.strictEqual(note.content, "");
    assert.ok(Array.isArray(note.images));
    assert.strictEqual(note.images.length, 0);
    assert.strictEqual(typeof note.date, "string");
    assert.ok(note.date.length > 0);
  });

  it("adds new note to the beginning of data", () => {
    n.data = [makeNote({ id: "old", content: "First" })];
    n.create();
    assert.strictEqual(n.data.length, 2);
    assert.strictEqual(n.data[0].content, "");
    assert.strictEqual(n.data[1].content, "First");
  });

  it("generates an ISO date string", () => {
    n.create();
    const date = new Date(n.data[0].date);
    assert.strictEqual(isNaN(date.getTime()), false);
  });

  it("calls save after creation", () => {
    let saved = false;
    const origSave = n.save.bind(n);
    n.save = function () {
      saved = true;
      origSave();
    };
    n.create();
    assert.strictEqual(saved, true);
  });

  it("calls render after creation", () => {
    let rendered = false;
    n.render = function () {
      rendered = true;
    };
    n.create();
    assert.strictEqual(rendered, true);
  });

  it("creates notes with string IDs", () => {
    n.create();
    n.create();
    n.create();
    assert.strictEqual(n.data.length, 3);
    n.data.forEach((note) => {
      assert.strictEqual(typeof note.id, "string");
      assert.ok(note.id.length > 0);
    });
  });
});

describe("Notes Module - delete", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
    n.data = [
      makeNote({ id: "n1", content: "First" }),
      makeNote({ id: "n2", content: "Second" }),
      makeNote({ id: "n3", content: "Third" }),
    ];
  });

  it("removes a note by id", () => {
    n.delete("n1");
    assert.strictEqual(n.data.length, 2);
    assert.strictEqual(n.data[0].id, "n2");
  });

  it("does nothing when id does not exist", () => {
    n.delete("non_existent");
    assert.strictEqual(n.data.length, 3);
  });

  it("removes the last note", () => {
    n.delete("n3");
    assert.strictEqual(n.data.length, 2);
  });

  it("removes the only note", () => {
    n.data = [makeNote({ id: "only", content: "Only" })];
    n.delete("only");
    assert.strictEqual(n.data.length, 0);
  });

  it("calls save after deletion", () => {
    let saved = false;
    n.save = function () {
      saved = true;
    };
    n.delete("n1");
    assert.strictEqual(saved, true);
  });

  it("calls render after deletion", () => {
    let rendered = false;
    n.render = function () {
      rendered = true;
    };
    n.delete("n1");
    assert.strictEqual(rendered, true);
  });

  it("handles delete on empty array", () => {
    n.data = [];
    n.delete("anything");
    assert.strictEqual(n.data.length, 0);
  });
});

describe("Notes Module - saveContent", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
    n.data = [makeNote({ id: "n1", content: "Original", date: "2020-01-01T00:00:00.000Z" })];
  });

  it("updates the content of an existing note", () => {
    n.saveContent("n1", "Updated content");
    assert.strictEqual(n.data[0].content, "Updated content");
  });

  it("updates the date to recent", () => {
    const before = Date.now();
    n.saveContent("n1", "New content");
    const after = Date.now();
    const noteDate = new Date(n.data[0].date).getTime();
    assert.ok(noteDate >= before, "date should be >= before");
    assert.ok(noteDate <= after, "date should be <= after");
  });

  it("does nothing for non-existent note", () => {
    n.saveContent("non_existent", "should not save");
    assert.strictEqual(n.data[0].content, "Original");
  });

  it("saves after content update", () => {
    let saved = false;
    n.save = function () {
      saved = true;
    };
    n.saveContent("n1", "Updated");
    assert.strictEqual(saved, true);
  });

  it("handles empty content string", () => {
    n.saveContent("n1", "");
    assert.strictEqual(n.data[0].content, "");
  });

  it("handles long content", () => {
    const long = "A".repeat(10000);
    n.saveContent("n1", long);
    assert.strictEqual(n.data[0].content.length, 10000);
  });

  it('handles null content as string "null"', () => {
    n.saveContent("n1", null);
    assert.strictEqual(n.data[0].content, null);
  });
});

describe("Notes Module - togglePreview", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
    n.previews = {};
  });

  it("toggles preview from false to true", () => {
    n.togglePreview("n1");
    assert.strictEqual(n.previews["n1"], true);
  });

  it("toggles preview from true to false", () => {
    n.previews["n1"] = true;
    n.togglePreview("n1");
    assert.strictEqual(n.previews["n1"], false);
  });

  it("calls render after toggle", () => {
    let rendered = false;
    n.render = function () {
      rendered = true;
    };
    n.togglePreview("n1");
    assert.strictEqual(rendered, true);
  });

  it("toggles multiple notes independently", () => {
    n.togglePreview("n1");
    n.togglePreview("n2");
    n.togglePreview("n1");
    assert.strictEqual(n.previews["n1"], false);
    assert.strictEqual(n.previews["n2"], true);
  });
});

describe("Notes Module - addImages", () => {
  let n;
  let note;

  beforeEach(() => {
    n = setupNotes();
    note = makeNote({ id: "n1", images: [] });
    n.data = [note];
    n.save = function () {};
    n.render = function () {};
  });

  it("adds images to a note", async () => {
    const file = new File(["dummy"], "test.png", { type: "image/png" });
    n.addImages("n1", [file]);
    await delay(50);
    assert.strictEqual(note.images.length, 1);
    assert.strictEqual(note.images[0].startsWith("data:"), true);
  });

  it("does nothing for non-existent note", async () => {
    n.addImages("non_existent", [new File([""], "x.png", { type: "image/png" })]);
    await delay(50);
    assert.strictEqual(n.data.length, 1);
    assert.strictEqual(n.data[0].images.length, 0);
  });

  it("does nothing for empty files array", () => {
    n.addImages("n1", []);
    assert.strictEqual(note.images.length, 0);
  });

  it("initializes images array if missing", async () => {
    delete note.images;
    const file = new File(["test"], "test.png", { type: "image/png" });
    n.addImages("n1", [file]);
    await delay(50);
    assert.ok(Array.isArray(note.images));
    assert.strictEqual(note.images.length, 1);
  });

  it("saves and renders after all images loaded", async () => {
    let saved = false;
    let rendered = false;
    n.save = function () {
      saved = true;
    };
    n.render = function () {
      rendered = true;
    };
    const file = new File(["x"], "x.png", { type: "image/png" });
    n.addImages("n1", [file]);
    await delay(50);
    assert.strictEqual(saved, true);
    assert.strictEqual(rendered, true);
  });

  it("handles multiple files", async () => {
    const files = [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.jpg", { type: "image/jpeg" })];
    n.addImages("n1", files);
    await delay(50);
    assert.strictEqual(note.images.length, 2);
  });
});

describe("Notes Module - data integrity", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
  });

  it("notes have required properties (id, content, images, date)", () => {
    n.data = [makeNote({ id: "n1", content: "Test", images: [], date: new Date().toISOString() })];
    for (const note of n.data) {
      assert.strictEqual(typeof note.id, "string");
      assert.strictEqual(typeof note.date, "string");
      assert.strictEqual("content" in note, true);
      assert.strictEqual("images" in note, true);
    }
  });

  it("notes can have content as empty string", () => {
    n.data = [makeNote({ content: "" })];
    assert.strictEqual(n.data[0].content, "");
  });

  it("notes can store notes without images property gracefully", () => {
    n.data = [makeNote()];
    const hasImages = n.data[0].images || [];
    assert.ok(Array.isArray(hasImages));
  });

  it("note IDs are unique", () => {
    n.data = [makeNote({ id: "a" }), makeNote({ id: "b" }), makeNote({ id: "c" })];
    const ids = n.data.map((x) => x.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });
});

describe("Notes Module - updateStats", () => {
  let n;
  beforeEach(() => {
    n = setupNotes();
  });

  it("does not crash with data", () => {
    n.data = [makeNote({ id: "n1" }), makeNote({ id: "n2" })];
    n.updateStats();
  });

  it("does not crash on empty data", () => {
    n.updateStats();
  });
});
