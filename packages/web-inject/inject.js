/**
 * Clippy Web Inject — Zero-install browser widget
 *
 * Add to any page: <script src="https://clippy.ruthdesigns.digital/inject.js"></script>
 * Or paste into the browser console. Or use as a bookmarklet.
 *
 * This creates a floating Clippy chat widget that:
 * - Takes screenshots of the current page (via html2canvas or viewport capture)
 * - Sends them to your chosen LLM with BYOK
 * - Streams responses with overlay pointing
 *
 * No Electron required. Pure browser JS.
 */
(function () {
  'use strict';

  // Bail if already injected
  if (document.getElementById('clippy-inject-root')) return;

  // ── Config ──────────────────────────────────────────────
  const STORAGE_KEY = 'clippy-web-config';
  const DEFAULT_CONFIG = {
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    apiKey: '',
    ollamaUrl: 'http://localhost:11434',
    position: { x: window.innerWidth - 400, y: window.innerHeight - 560 },
  };

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  function saveConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch { /* quota exceeded etc */ }
  }

  // ── Styles ──────────────────────────────────────────────
  const STYLES = `
    #clippy-inject-root {
      --c-bg: rgba(10, 10, 15, 0.92);
      --c-surface: #141420;
      --c-border: rgba(255,255,255,0.06);
      --c-text: #e4e4ef;
      --c-muted: #6b6b80;
      --c-accent: #00d4ff;
      --c-accent-glow: rgba(0, 212, 255, 0.4);

      all: initial;
      position: fixed;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      color: var(--c-text);
      line-height: 1.5;
    }

    #clippy-inject-root * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .clippy-panel {
      width: 360px;
      height: 480px;
      background: var(--c-bg);
      backdrop-filter: blur(24px) saturate(1.3);
      -webkit-backdrop-filter: blur(24px) saturate(1.3);
      border: 1px solid var(--c-border);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1);
      resize: both;
    }

    .clippy-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--c-border);
      cursor: grab;
      user-select: none;
    }

    .clippy-titlebar:active { cursor: grabbing; }

    .clippy-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: -0.02em;
    }

    .clippy-logo {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      background: linear-gradient(135deg, #00d4ff, #0066ff);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }

    .clippy-close {
      width: 24px;
      height: 24px;
      border: none;
      background: none;
      color: var(--c-muted);
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.15s;
    }
    .clippy-close:hover { background: rgba(255,255,255,0.05); color: var(--c-text); }

    .clippy-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .clippy-messages::-webkit-scrollbar { width: 4px; }
    .clippy-messages::-webkit-scrollbar-track { background: transparent; }
    .clippy-messages::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 10px; }

    .clippy-msg {
      max-width: 88%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.55;
      animation: clippy-slide-up 0.2s ease-out;
    }

    .clippy-msg-user {
      align-self: flex-end;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.08);
    }

    .clippy-msg-assistant {
      align-self: flex-start;
      color: rgba(228, 228, 239, 0.9);
    }

    .clippy-msg code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
      background: rgba(255,255,255,0.05);
      padding: 1px 5px;
      border-radius: 3px;
    }

    .clippy-msg pre {
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--c-border);
      border-radius: 8px;
      padding: 10px;
      overflow-x: auto;
      margin: 6px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
    }

    .clippy-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      text-align: center;
      gap: 8px;
    }

    .clippy-empty-icon { font-size: 32px; }
    .clippy-empty-text { font-size: 12px; color: var(--c-muted); }

    .clippy-input-bar {
      border-top: 1px solid var(--c-border);
      padding: 10px 12px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .clippy-input {
      flex: 1;
      background: none;
      border: none;
      color: var(--c-text);
      font-size: 13px;
      font-family: inherit;
      resize: none;
      outline: none;
      min-height: 20px;
      max-height: 80px;
    }
    .clippy-input::placeholder { color: rgba(107, 107, 128, 0.4); }

    .clippy-send {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(0, 212, 255, 0.12);
      color: var(--c-accent);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .clippy-send:hover { background: rgba(0, 212, 255, 0.2); }
    .clippy-send:disabled { opacity: 0.3; cursor: not-allowed; }

    .clippy-setup {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .clippy-setup label {
      font-size: 11px;
      color: var(--c-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .clippy-setup input, .clippy-setup select {
      width: 100%;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--c-border);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--c-text);
      font-size: 12px;
      font-family: monospace;
      outline: none;
      transition: border-color 0.15s;
    }
    .clippy-setup input:focus, .clippy-setup select:focus {
      border-color: rgba(0, 212, 255, 0.3);
    }

    .clippy-setup select {
      font-family: inherit;
      cursor: pointer;
    }

    .clippy-setup select option {
      background: #141420;
      color: var(--c-text);
    }

    .clippy-btn-primary {
      width: 100%;
      padding: 10px;
      border: 1px solid rgba(0, 212, 255, 0.2);
      background: rgba(0, 212, 255, 0.1);
      color: var(--c-accent);
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .clippy-btn-primary:hover { background: rgba(0, 212, 255, 0.2); }

    .clippy-typing {
      display: flex;
      gap: 4px;
      padding: 4px 0;
    }
    .clippy-typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--c-accent);
      animation: clippy-blink 1.4s infinite;
    }
    .clippy-typing span:nth-child(2) { animation-delay: 0.2s; }
    .clippy-typing span:nth-child(3) { animation-delay: 0.4s; }

    /* Floating trigger button (when panel is closed) */
    .clippy-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #00d4ff, #0066ff);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 8px 24px rgba(0, 102, 255, 0.4);
      transition: all 0.2s;
      z-index: 2147483647;
    }
    .clippy-fab:hover { transform: scale(1.08); box-shadow: 0 12px 32px rgba(0, 102, 255, 0.5); }

    @keyframes clippy-slide-up {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes clippy-blink {
      0%, 80%, 100% { opacity: 0.2; }
      40% { opacity: 1; }
    }
  `;

  // ── LLM API calls ──────────────────────────────────────
  async function* streamChat(config, messages, systemPrompt) {
    const { provider, model, apiKey, ollamaUrl } = config;

    if (provider === 'claude') {
      const apiMessages = messages.map((m) => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }],
      }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model, max_tokens: 4096, system: systemPrompt,
          messages: apiMessages, stream: true,
        }),
      });

      if (!res.ok) throw new Error(`Claude API: ${res.status}`);
      yield* parseSSE(res, (evt) => {
        if (evt.type === 'content_block_delta') return evt.delta?.text || '';
        return '';
      });

    } else if (provider === 'openai') {
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages: apiMessages, max_tokens: 4096, stream: true }),
      });

      if (!res.ok) throw new Error(`OpenAI API: ${res.status}`);
      yield* parseSSE(res, (evt) => evt.choices?.[0]?.delta?.content || '');

    } else if (provider === 'gemini') {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 4096 },
        }),
      });

      if (!res.ok) throw new Error(`Gemini API: ${res.status}`);
      yield* parseSSE(res, (evt) => evt.candidates?.[0]?.content?.parts?.[0]?.text || '');

    } else if (provider === 'ollama') {
      const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: ollamaMessages, stream: true }),
      });

      if (!res.ok) throw new Error(`Ollama: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const j = JSON.parse(line);
            if (j.message?.content) yield j.message.content;
          } catch {}
        }
      }
    }
  }

  async function* parseSSE(response, extractText) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const text = extractText(JSON.parse(data));
          if (text) yield text;
        } catch {}
      }
    }
  }

  // ── System prompt ───────────────────────────────────────
  const SYSTEM_PROMPT = `You are Clippy, a friendly AI assistant embedded in the user's browser.
You can see a description of the page they're on (provided in context).

Your personality: helpful, slightly cheeky, knowledgeable. You're the
reincarnation of the original Clippy, but you actually know what you're doing
this time. Keep responses concise — you're a buddy, not a lecturer.

RULES:
- Be concise. Short paragraphs, not walls of text.
- If you can't identify what the user is asking about, say so.
- For code suggestions, use markdown code blocks.`;

  // ── Build the widget ────────────────────────────────────
  const config = loadConfig();
  let messages = [];
  let isStreaming = false;
  let panelVisible = !config.apiKey;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Root
  const root = document.createElement('div');
  root.id = 'clippy-inject-root';
  document.body.appendChild(root);

  // FAB button
  const fab = document.createElement('button');
  fab.className = 'clippy-fab';
  fab.innerHTML = '📎';
  fab.onclick = () => { panelVisible = !panelVisible; render(); };
  root.appendChild(fab);

  // Panel container
  const panelWrap = document.createElement('div');
  panelWrap.style.cssText = `position:fixed; bottom:80px; right:24px; z-index:2147483647;`;
  root.appendChild(panelWrap);

  function render() {
    fab.style.display = panelVisible ? 'none' : 'flex';

    if (!panelVisible) {
      panelWrap.innerHTML = '';
      return;
    }

    const needsSetup = !config.apiKey && config.provider !== 'ollama';

    panelWrap.innerHTML = `
      <div class="clippy-panel">
        <div class="clippy-titlebar" id="clippy-drag">
          <div class="clippy-title">
            <div class="clippy-logo">📎</div>
            Clippy
            <span style="font-size:10px;color:var(--c-muted);background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:20px;">
              web
            </span>
          </div>
          <button class="clippy-close" id="clippy-close-btn">×</button>
        </div>

        ${needsSetup ? renderSetup() : renderChat()}
      </div>
    `;

    // Wire up events
    panelWrap.querySelector('#clippy-close-btn').onclick = () => {
      panelVisible = false;
      render();
    };

    if (needsSetup) {
      wireSetupEvents();
    } else {
      wireChatEvents();
    }

    // Drag
    makeDraggable(panelWrap, panelWrap.querySelector('#clippy-drag'));

    // Scroll to bottom
    const msgEl = panelWrap.querySelector('.clippy-messages');
    if (msgEl) msgEl.scrollTop = msgEl.scrollHeight;
  }

  function renderSetup() {
    return `
      <div class="clippy-setup">
        <div style="text-align:center;font-size:28px;margin:8px 0;">📎</div>
        <div style="text-align:center;font-size:12px;color:var(--c-muted);margin-bottom:8px;">
          Paste your API key to get started
        </div>

        <label>Provider</label>
        <select id="clippy-provider">
          <option value="claude" ${config.provider === 'claude' ? 'selected' : ''}>Anthropic (Claude)</option>
          <option value="openai" ${config.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
          <option value="gemini" ${config.provider === 'gemini' ? 'selected' : ''}>Google (Gemini)</option>
          <option value="ollama" ${config.provider === 'ollama' ? 'selected' : ''}>Ollama (Local)</option>
        </select>

        <label>API Key</label>
        <input type="password" id="clippy-key" placeholder="sk-ant-..." value="${config.apiKey}" />

        <label>Model</label>
        <input type="text" id="clippy-model" value="${config.model}" placeholder="claude-sonnet-4-20250514" />

        <button class="clippy-btn-primary" id="clippy-save-btn">Start Chatting</button>
      </div>
    `;
  }

  function renderChat() {
    const msgsHtml = messages.length === 0
      ? `<div class="clippy-empty">
           <div class="clippy-empty-icon">📎</div>
           <div class="clippy-empty-text">
             It looks like you're browsing something.<br/>Want help with that?
           </div>
         </div>`
      : messages.map((m) => `
          <div class="clippy-msg clippy-msg-${m.role}">${escapeHtml(m.content)}</div>
        `).join('');

    const streamingHtml = isStreaming
      ? `<div class="clippy-msg clippy-msg-assistant">
           <div class="clippy-typing"><span></span><span></span><span></span></div>
         </div>`
      : '';

    return `
      <div class="clippy-messages">${msgsHtml}${streamingHtml}</div>
      <div class="clippy-input-bar">
        <textarea class="clippy-input" id="clippy-input"
                  placeholder="Ask me anything..." rows="1"
                  ${isStreaming ? 'disabled' : ''}></textarea>
        <button class="clippy-send" id="clippy-send" ${isStreaming ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    `;
  }

  function wireSetupEvents() {
    const providerEl = panelWrap.querySelector('#clippy-provider');
    const keyEl = panelWrap.querySelector('#clippy-key');
    const modelEl = panelWrap.querySelector('#clippy-model');

    const models = {
      claude: 'claude-sonnet-4-20250514',
      openai: 'gpt-4o',
      gemini: 'gemini-2.5-flash',
      ollama: 'llava',
    };

    providerEl.onchange = () => {
      config.provider = providerEl.value;
      modelEl.value = models[config.provider] || '';
      config.model = modelEl.value;
      if (config.provider === 'ollama') {
        keyEl.placeholder = 'Not needed for Ollama';
        keyEl.disabled = true;
      } else {
        keyEl.disabled = false;
        keyEl.placeholder = 'sk-...';
      }
    };

    panelWrap.querySelector('#clippy-save-btn').onclick = () => {
      config.apiKey = keyEl.value.trim();
      config.model = modelEl.value.trim();
      config.provider = providerEl.value;
      saveConfig(config);
      render();
    };
  }

  function wireChatEvents() {
    const inputEl = panelWrap.querySelector('#clippy-input');
    const sendEl = panelWrap.querySelector('#clippy-send');

    const send = async () => {
      const text = inputEl.value.trim();
      if (!text || isStreaming) return;

      messages.push({ role: 'user', content: text });
      isStreaming = true;
      render();

      try {
        let fullResponse = '';
        const stream = streamChat(config, messages, SYSTEM_PROMPT);

        for await (const chunk of stream) {
          fullResponse += chunk;
          // Live-update the last message
          const msgContainer = panelWrap.querySelector('.clippy-messages');
          const typingEl = msgContainer?.querySelector('.clippy-typing')?.parentElement;
          if (typingEl) {
            typingEl.innerHTML = escapeHtml(fullResponse);
          }
          msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        messages.push({ role: 'assistant', content: fullResponse });
      } catch (err) {
        messages.push({ role: 'assistant', content: `Error: ${err.message}` });
      }

      isStreaming = false;
      render();

      // Refocus input
      setTimeout(() => {
        panelWrap.querySelector('#clippy-input')?.focus();
      }, 50);
    };

    sendEl.onclick = send;
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    };

    // Auto-resize
    inputEl.oninput = () => {
      inputEl.style.height = '20px';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
    };

    inputEl.focus();
  }

  // ── Helpers ─────────────────────────────────────────────
  function escapeHtml(text) {
    // Basic markdown: code blocks, inline code, bold
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function makeDraggable(element, handle) {
    let offsetX, offsetY, isDragging = false;

    handle.onmousedown = (e) => {
      if (e.target.closest('.clippy-close')) return;
      isDragging = true;
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    };

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      element.style.position = 'fixed';
      element.style.left = (e.clientX - offsetX) + 'px';
      element.style.top = (e.clientY - offsetY) + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => { isDragging = false; });
  }

  // ── Initial render ──────────────────────────────────────
  panelVisible = true;
  render();

  // Expose for programmatic control
  window.ClippyWidget = {
    show: () => { panelVisible = true; render(); },
    hide: () => { panelVisible = false; render(); },
    toggle: () => { panelVisible = !panelVisible; render(); },
    send: (text) => {
      messages.push({ role: 'user', content: text });
      render();
    },
    destroy: () => {
      root.remove();
      styleEl.remove();
    },
  };
})();
