"use strict";
const { describe, it, before } = require("node:test");
const assert = require("node:assert");
const { loadModule } = require("./helpers/load");

/**
 * Load the AI module and set up minimal mocks for DOM-dependent properties.
 */
function setupAI() {
  const AI = loadModule("js/modules/ai.js");
  // Set up conversation properties
  AI.conversations = [];
  AI.currentId = null;
  AI.attachments = [];

  // Mock DOM-dependent refs
  const mockChat = {
    innerHTML: "",
    appendChild: (_el) => {},
    scrollTop: 0,
    scrollHeight: 0,
  };
  const mockInput = {
    disabled: false,
    value: "",
    style: { height: "auto" },
    placeholder: "",
    focus: () => {},
    dispatchEvent: () => {},
  };
  const mockBtn = { disabled: false };
  const mockIndicator = { className: "", textContent: "" };
  const mockConvList = {
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
    scrollIntoView: () => {},
  };

  AI.chat = mockChat;
  AI.input = mockInput;
  AI.sendBtn = mockBtn;
  AI.indicator = mockIndicator;
  AI.statusText = { textContent: "" };
  AI.convList = mockConvList;

  // Override DOM-dependent methods to be no-ops for testing pure logic
  AI.renderConvList = function () {
    this.convList.innerHTML =
      '<div class="ai-conv-title">Conversas</div>' +
      this.conversations
        .map((c) => {
          const preview = c.messages.length > 0 ? c.messages[c.messages.length - 1].content.slice(0, 40) : "Vazio";
          return `<div class="ai-conv-item ${c.id === this.currentId ? "active" : ""}" data-id="${c.id}">
          <div class="ai-conv-item-top">
            <span class="ai-conv-name">${String(c.title).replace(/</g, "&lt;")}</span>
          </div>
          <div class="ai-conv-preview">${preview.replace(/</g, "&lt;")}</div>
        </div>`;
        })
        .join("");
  };
  AI.loadChat = function () {
    this.chat.innerHTML = "";
    const conv = this.currentConv;
    if (!conv) {
      this.chat.innerHTML = '<div class="ai-empty-chat">Nenhuma conversa ativa</div>';
      this.input.disabled = true;
      this.sendBtn.disabled = true;
      return;
    }
    this.input.disabled = false;
    this.sendBtn.disabled = false;
    conv.messages.forEach((m) => {
      if (m.role === "system") this.addSystem(m.content, false);
      else this.addMessage(m.role, m.content, false);
    });
    this.chat.scrollTop = this.chat.scrollHeight;
  };
  AI.renderAttachments = function () {
    // no-op for testing
  };
  AI.scrollConv = function () {};

  return AI;
}

describe("AI Module - Inline Markdown", () => {
  let AI;
  before(() => {
    AI = setupAI();
  });

  it("renders bold text", () => {
    assert.strictEqual(AI.inline("**bold**"), "<strong>bold</strong>");
  });

  it("renders italic text", () => {
    assert.strictEqual(AI.inline("*italic*"), "<em>italic</em>");
  });

  it("renders inline code", () => {
    assert.strictEqual(AI.inline("`code`"), "<code>code</code>");
  });

  it("renders links", () => {
    assert.strictEqual(
      AI.inline("[text](https://example.com)"),
      '<a href="https://example.com" target="_blank" rel="noopener">text</a>',
    );
  });

  it("passes plain text through unchanged", () => {
    assert.strictEqual(AI.inline("plain text"), "plain text");
  });

  it("handles already-escaped HTML", () => {
    assert.strictEqual(AI.inline("hello &amp; world"), "hello &amp; world");
  });
});

describe("AI Module - renderMarkdown", () => {
  let AI;
  before(() => {
    AI = setupAI();
  });

  it("renders a paragraph", () => {
    assert.strictEqual(AI.renderMarkdown("Hello world"), "<p>Hello world</p>");
  });

  it("renders multiple paragraphs", () => {
    assert.strictEqual(
      AI.renderMarkdown("First paragraph\n\nSecond paragraph"),
      "<p>First paragraph</p><p>Second paragraph</p>",
    );
  });

  it("renders h1 heading", () => {
    assert.strictEqual(AI.renderMarkdown("# Title"), "<h1>Title</h1>");
  });

  it("renders h2 heading", () => {
    assert.strictEqual(AI.renderMarkdown("## Subtitle"), "<h2>Subtitle</h2>");
  });

  it("renders h3 heading", () => {
    assert.strictEqual(AI.renderMarkdown("### Section"), "<h3>Section</h3>");
  });

  it("renders unordered list items", () => {
    assert.strictEqual(AI.renderMarkdown("- Item 1\n- Item 2"), "<li>Item 1</li><li>Item 2</li>");
  });

  it("renders ordered list items", () => {
    assert.strictEqual(AI.renderMarkdown("1. First\n2. Second"), "<li>First</li><li>Second</li>");
  });

  it("renders code blocks", () => {
    assert.strictEqual(AI.renderMarkdown("```\nconst x = 1;\n```"), "<pre><code>const x = 1;\n</code></pre>");
  });

  it("escapes HTML tags", () => {
    const html = AI.renderMarkdown('<script>alert("xss")</script>');
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<script>"));
  });

  it("renders mixed content correctly", () => {
    const md = "# Title\n\nParagraph with **bold** and *italic*.\n\n- Item\n- Another";
    const html = AI.renderMarkdown(md);
    assert.ok(html.includes("<h1>Title</h1>"));
    assert.ok(html.includes("<strong>bold</strong>"));
    assert.ok(html.includes("<em>italic</em>"));
    assert.ok(html.includes("<li>Item</li>"));
    assert.ok(html.includes("<li>Another</li>"));
  });

  it("handles empty string", () => {
    assert.strictEqual(AI.renderMarkdown(""), "");
  });

  it("renders blockquote as paragraph", () => {
    assert.strictEqual(AI.renderMarkdown("> Citação"), "<p>Citação</p>");
  });
});

describe("AI Module - Conversations", () => {
  let AI;
  before(() => {
    AI = setupAI();
  });

  it("starts with an empty conversation list", () => {
    assert.ok(Array.isArray(AI.conversations));
    assert.strictEqual(AI.conversations.length, 0);
  });

  it("newChat creates a conversation with auto-generated ID", () => {
    AI.newChat();
    assert.strictEqual(AI.conversations.length, 1);
    assert.ok(AI.currentId.startsWith("conv_"));
    assert.strictEqual(AI.conversations[0].title, "Conversa 1");
  });

  it("multiple newChat calls increment title number", () => {
    AI.newChat();
    assert.strictEqual(AI.conversations.length, 2);
    assert.strictEqual(AI.conversations[1].title, "Conversa 2");
  });

  it("switchChat changes current conversation and clears attachments", () => {
    const firstId = AI.conversations[0].id;
    const secondId = AI.conversations[1].id;
    AI.attachments = [{ type: "file", name: "x", content: "y" }];
    AI.switchChat(firstId);
    assert.strictEqual(AI.currentId, firstId);
    assert.strictEqual(AI.attachments.length, 0, "should clear attachments");
    AI.switchChat(secondId);
    assert.strictEqual(AI.currentId, secondId);
  });

  it("currentConv returns the active conversation", () => {
    const id = AI.currentId;
    const conv = AI.currentConv;
    assert.ok(conv);
    assert.strictEqual(conv.id, id);
  });

  it("currentConv returns undefined for non-existent id", () => {
    AI.currentId = "non_existent";
    assert.strictEqual(AI.currentConv, undefined);
  });

  it("attachments can be added and removed", () => {
    AI.attachments = [];
    AI.attachments.push({ type: "file", name: "test.txt", content: "hello" });
    AI.attachments.push({ type: "link", name: "Example", url: "https://ex.com", content: "page" });
    assert.strictEqual(AI.attachments.length, 2);
    AI.removeAttachment(0);
    assert.strictEqual(AI.attachments.length, 1);
    assert.strictEqual(AI.attachments[0].type, "link");
  });
});
