(function () {
  "use strict";

  // ---- Configuration ----
  // Point this at your deployed backend. If the widget is served from
  // the same domain as the API (recommended), a relative path works.
  var CHAT_ENDPOINT = "/api/chat";
  var BOT_NAME = "D&Y Assistant";
  var WELCOME_MESSAGE = "Hi! I can answer questions about our website design, automation, AI, and SEO services. What can I help with?";
  var MAX_HISTORY_SENT = 20;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(init);

  function init() {
    injectStyles();
    var root = buildWidget();
    document.body.appendChild(root);
    wireEvents(root);
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent = [
      ".dyc-fab{position:fixed;bottom:22px;right:22px;width:58px;height:58px;border-radius:50%;",
      "background:var(--blue,#2563EB);color:#fff;border:none;cursor:pointer;",
      "box-shadow:0 10px 30px -8px rgba(37,99,235,.55);z-index:9999;",
      "display:flex;align-items:center;justify-content:center;transition:transform .18s ease;}",
      ".dyc-fab:hover{transform:translateY(-2px) scale(1.03);}",
      ".dyc-fab svg{width:26px;height:26px;}",
      ".dyc-fab .dyc-icon-close{display:none;}",
      ".dyc-fab.dyc-open .dyc-icon-chat{display:none;}",
      ".dyc-fab.dyc-open .dyc-icon-close{display:block;}",

      ".dyc-panel{position:fixed;bottom:92px;right:22px;width:370px;max-width:calc(100vw - 32px);",
      "height:520px;max-height:calc(100vh - 140px);background:var(--white,#fff);",
      "border:1px solid var(--border,#E2E8F0);border-radius:18px;",
      "box-shadow:0 24px 60px -20px rgba(15,23,42,.28);z-index:9999;",
      "display:none;flex-direction:column;overflow:hidden;",
      "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      ".dyc-panel.dyc-open{display:flex;}",

      ".dyc-header{padding:16px 18px;background:var(--blue,#2563EB);color:#fff;",
      "display:flex;align-items:center;gap:10px;flex-shrink:0;}",
      ".dyc-header-title{font-weight:700;font-size:.95rem;}",
      ".dyc-header-sub{font-size:.75rem;opacity:.85;margin-top:1px;}",

      ".dyc-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;",
      "background:var(--surface,#F8FAFC);}",

      ".dyc-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:.87rem;line-height:1.45;",
      "white-space:pre-wrap;word-wrap:break-word;}",
      ".dyc-msg-bot{align-self:flex-start;background:var(--white,#fff);color:var(--ink,#0F172A);",
      "border:1px solid var(--border,#E2E8F0);border-bottom-left-radius:4px;}",
      ".dyc-msg-user{align-self:flex-end;background:var(--blue,#2563EB);color:#fff;",
      "border-bottom-right-radius:4px;}",
      ".dyc-msg-error{align-self:flex-start;background:#FEF2F2;color:#B91C1C;",
      "border:1px solid #FECACA;border-bottom-left-radius:4px;}",

      ".dyc-typing{align-self:flex-start;display:flex;gap:4px;padding:12px 14px;",
      "background:var(--white,#fff);border:1px solid var(--border,#E2E8F0);border-radius:14px;",
      "border-bottom-left-radius:4px;}",
      ".dyc-typing span{width:6px;height:6px;border-radius:50%;background:var(--ink-muted,#94A3B8);",
      "animation:dyc-bounce 1.1s infinite ease-in-out;}",
      ".dyc-typing span:nth-child(2){animation-delay:.15s;}",
      ".dyc-typing span:nth-child(3){animation-delay:.3s;}",
      "@keyframes dyc-bounce{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-4px);opacity:1;}}",

      ".dyc-inputrow{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border,#E2E8F0);",
      "background:var(--white,#fff);flex-shrink:0;}",
      ".dyc-input{flex:1;border:1px solid var(--border,#E2E8F0);border-radius:10px;padding:10px 12px;",
      "font-size:.87rem;font-family:inherit;color:var(--ink,#0F172A);background:var(--white,#fff);resize:none;}",
      ".dyc-input:focus{outline:none;border-color:var(--blue,#2563EB);}",
      ".dyc-send{width:38px;height:38px;flex-shrink:0;border-radius:10px;border:none;",
      "background:var(--blue,#2563EB);color:#fff;cursor:pointer;display:flex;",
      "align-items:center;justify-content:center;}",
      ".dyc-send:disabled{opacity:.5;cursor:default;}",
      ".dyc-send svg{width:17px;height:17px;}",

      "@media (max-width:480px){",
      ".dyc-panel{right:16px;bottom:88px;width:calc(100vw - 32px);height:calc(100vh - 140px);}",
      ".dyc-fab{right:16px;bottom:16px;}",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function el(tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function buildWidget() {
    var wrap = document.createElement("div");

    var fab = el(
      "button",
      "dyc-fab",
      '<svg class="dyc-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<svg class="dyc-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
    );
    fab.setAttribute("aria-label", "Open chat assistant");
    fab.type = "button";

    var panel = el("div", "dyc-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", BOT_NAME);

    var header = el(
      "div",
      "dyc-header",
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px;flex-shrink:0;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<div><div class="dyc-header-title">' + BOT_NAME + '</div><div class="dyc-header-sub">Ask about our services</div></div>'
    );

    var messages = el("div", "dyc-messages");
    messages.setAttribute("aria-live", "polite");

    var inputRow = el("div", "dyc-inputrow");
    var input = el("textarea", "dyc-input");
    input.rows = 1;
    input.placeholder = "Type a message…";
    input.setAttribute("aria-label", "Message");

    var sendBtn = el(
      "button",
      "dyc-send",
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    );
    sendBtn.type = "button";
    sendBtn.setAttribute("aria-label", "Send message");

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputRow);

    wrap.appendChild(fab);
    wrap.appendChild(panel);

    wrap._fab = fab;
    wrap._panel = panel;
    wrap._messages = messages;
    wrap._input = input;
    wrap._sendBtn = sendBtn;

    return wrap;
  }

  function wireEvents(root) {
    var history = []; // {role: "user"|"assistant", content: string}
    var isOpen = false;
    var isSending = false;
    var hasGreeted = false;

    function toggle() {
      isOpen = !isOpen;
      root._fab.classList.toggle("dyc-open", isOpen);
      root._panel.classList.toggle("dyc-open", isOpen);
      if (isOpen) {
        if (!hasGreeted) {
          appendMessage("bot", WELCOME_MESSAGE);
          hasGreeted = true;
        }
        root._input.focus();
      }
    }

    function appendMessage(role, text) {
      var cls = role === "user" ? "dyc-msg-user" : role === "error" ? "dyc-msg-error" : "dyc-msg-bot";
      var bubble = el("div", "dyc-msg " + cls);
      bubble.textContent = text;
      root._messages.appendChild(bubble);
      root._messages.scrollTop = root._messages.scrollHeight;
    }

    function showTyping() {
      var t = el("div", "dyc-typing", "<span></span><span></span><span></span>");
      t.setAttribute("data-typing", "1");
      root._messages.appendChild(t);
      root._messages.scrollTop = root._messages.scrollHeight;
      return t;
    }

    function autoGrow() {
      root._input.style.height = "auto";
      root._input.style.height = Math.min(root._input.scrollHeight, 96) + "px";
    }

    function send() {
      var text = root._input.value.trim();
      if (!text || isSending) return;

      appendMessage("user", text);
      history.push({ role: "user", content: text });
      if (history.length > MAX_HISTORY_SENT) {
        history = history.slice(-MAX_HISTORY_SENT);
      }

      root._input.value = "";
      autoGrow();
      isSending = true;
      root._sendBtn.disabled = true;
      var typingEl = showTyping();

      fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (result) {
          typingEl.remove();
          if (result.ok && result.data && result.data.reply) {
            appendMessage("bot", result.data.reply);
            history.push({ role: "assistant", content: result.data.reply });
          } else {
            appendMessage("error", (result.data && result.data.error) || "Something went wrong. Please try again, or use the contact form.");
          }
        })
        .catch(function () {
          typingEl.remove();
          appendMessage("error", "Couldn't reach the assistant. Please check your connection or use the contact form.");
        })
        .finally(function () {
          isSending = false;
          root._sendBtn.disabled = false;
        });
    }

    root._fab.addEventListener("click", toggle);
    root._sendBtn.addEventListener("click", send);
    root._input.addEventListener("input", autoGrow);
    root._input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  }
})();
