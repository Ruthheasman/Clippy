/**
 * Blepper Side Panel — Main Application Logic
 *
 * Pure vanilla JS (no React, no bundler). Keeps the extension lightweight
 * and avoids needing a build step. The side panel is the main UI — chat,
 * models, keys, buddies — all managed here.
 */

// ── Provider / Model / Buddy definitions ─────────────────

const PROVIDERS = [
  {
    id: 'claude', name: 'Anthropic', emoji: '🟠',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', vision: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', vision: true },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', vision: true },
    ],
    requiresKey: true, placeholder: 'sk-ant-...', hint: 'console.anthropic.com',
  },
  {
    id: 'openai', name: 'OpenAI', emoji: '🟢',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', vision: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', vision: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', vision: true },
    ],
    requiresKey: true, placeholder: 'sk-...', hint: 'platform.openai.com',
  },
  {
    id: 'gemini', name: 'Google Gemini', emoji: '🔵',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', vision: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', vision: true },
    ],
    requiresKey: true, placeholder: 'AIza...', hint: 'aistudio.google.com',
  },
  {
    id: 'ollama', name: 'Ollama', emoji: '🖥️',
    models: [
      { id: 'llava', name: 'LLaVA', vision: true },
      { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', vision: true },
    ],
    requiresKey: false, placeholder: '', hint: 'localhost:11434',
  },
  {
    id: 'lmstudio', name: 'LM Studio', emoji: '🧪',
    models: [
      { id: 'loaded-model', name: 'Loaded Model', vision: true },
    ],
    requiresKey: false, placeholder: '', hint: 'localhost:1234',
  },
];

const DEFAULT_BUDDIES = [
  { id: 'blepper', name: 'Blepper', emoji: '🐱', desc: 'All-purpose screen companion', prompt: '' },
  { id: 'nitpick', name: 'Nitpick', emoji: '🔍', desc: 'Opinionated code reviewer',
    prompt: 'You are Nitpick, a brutally honest but constructive code reviewer. Point at specific lines with issues. Be direct but always suggest fixes. Praise genuinely good code sparingly.' },
  { id: 'pixel', name: 'Pixel', emoji: '🎨', desc: 'UI/UX design critic',
    prompt: 'You are Pixel, a design-obsessed UI critic. Point at alignment issues, spacing problems, colour clashes. Reference design principles. Mediocre design physically hurts you.' },
  { id: 'prof', name: 'Prof', emoji: '🎓', desc: 'Patient tutor',
    prompt: 'You are Prof, a patient and encouraging tutor. Use POINT extensively to guide eyes. Break concepts into small steps. Use analogies. Celebrate progress.' },
];

// ── Built-in Skills ──────────────────────────────────────

const BUILT_IN_SKILLS = [
  { id: 'unreal-engine', name: 'Unreal Engine 5', emoji: '🎮', desc: 'Blueprints, Materials, Niagara VFX' },
  { id: 'web-dev', name: 'Web Development', emoji: '🌐', desc: 'React, TypeScript, CSS, Node.js' },
];

// ── State ────────────────────────────────────────────────

let state = {
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  autoScreenshot: true,
  activeBuddyId: 'blepper',
  activeSkills: [],
  buddies: [...DEFAULT_BUDDIES],
  messages: [],
  isStreaming: false,
  streamingText: '',
};

// Load persisted state
chrome.storage.local.get(['provider', 'model', 'autoScreenshot', 'activeBuddyId', 'activeSkills', 'customBuddies'], (data) => {
  if (data.provider) state.provider = data.provider;
  if (data.model) state.model = data.model;
  if (data.autoScreenshot !== undefined) state.autoScreenshot = data.autoScreenshot;
  if (data.activeBuddyId) state.activeBuddyId = data.activeBuddyId;
  if (data.activeSkills) state.activeSkills = data.activeSkills;
  if (data.customBuddies) state.buddies = [...DEFAULT_BUDDIES, ...data.customBuddies];
  renderModels();
  renderBuddies();
  renderSkills();
  updateBuddyIndicator();
});

function persist() {
  const custom = state.buddies.filter(b => !DEFAULT_BUDDIES.find(d => d.id === b.id));
  chrome.storage.local.set({
    provider: state.provider,
    model: state.model,
    autoScreenshot: state.autoScreenshot,
    activeBuddyId: state.activeBuddyId,
    activeSkills: state.activeSkills,
    customBuddies: custom,
  });
}

// ── DOM refs ─────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const messagesEl = $('#messages');
const inputEl = $('#chat-input');
const sendBtn = $('#send-btn');
const screenshotToggle = $('#screenshot-toggle');
const screenshotStatus = $('#screenshot-status');
const buddyIndicator = $('#buddy-indicator');

// ── Navigation ───────────────────────────────────────────

$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const panelId = btn.dataset.panel;
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.panel').forEach(p => p.classList.remove('active'));
    $(`#panel-${panelId}`).classList.add('active');
  });
});

// ── Chat ─────────────────────────────────────────────────

inputEl.addEventListener('input', () => {
  inputEl.style.height = '20px';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
  sendBtn.disabled = !inputEl.value.trim() || state.isStreaming;
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || state.isStreaming) return;

  inputEl.value = '';
  inputEl.style.height = '20px';
  sendBtn.disabled = true;

  // Capture screenshot
  let screenshot = null;
  if (state.autoScreenshot) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.runtime.sendMessage({ type: 'capture-screenshot', tabId: tab?.id });
      screenshot = result?.image || null;
    } catch (err) {
      console.warn('Screenshot failed:', err);
    }
  }

  // Add user message
  state.messages.push({ role: 'user', content: text });
  renderMessages();

  // Start streaming
  state.isStreaming = true;
  state.streamingText = '';
  renderMessages();

  const buddy = state.buddies.find(b => b.id === state.activeBuddyId);

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'chat',
      params: {
        provider: state.provider,
        model: state.model,
        messages: state.messages.filter(m => m.role !== 'error').map(m => ({ role: m.role, content: m.content })),
        screenshot,
        buddyPrompt: buddy?.prompt || undefined,
        skillIds: state.activeSkills.length > 0 ? state.activeSkills : undefined,
      },
    });

    if (result?.error) {
      addErrorMessage(result.error);
    }
  } catch (err) {
    addErrorMessage(err.message || 'Request failed');
  }
}

// Listen for streaming chunks from service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'chat-chunk') return;

  if (message.done) {
    // Finalise
    if (state.streamingText.trim()) {
      const clean = stripTags(state.streamingText);
      state.messages.push({ role: 'assistant', content: clean });
    }
    state.isStreaming = false;
    state.streamingText = '';
    renderMessages();
    inputEl.disabled = false;
    inputEl.focus();
  } else {
    state.streamingText += message.text;
    renderMessages();
  }
});

function addErrorMessage(text) {
  state.isStreaming = false;
  state.streamingText = '';
  state.messages.push({ role: 'error', content: text });
  renderMessages();
}

function stripTags(text) {
  return text
    .replace(/\[POINT:\d+,\d+:[^\]]*\]/g, '')
    .replace(/\[HIGHLIGHT:\d+,\d+,\d+,\d+:[^\]]*\]/g, '')
    .replace(/\[ARROW:\d+,\d+,\d+,\d+:[^\]]*\]/g, '')
    .replace(/\[CIRCLE:\d+,\d+,\d+:[^\]]*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderMessages() {
  const isEmpty = state.messages.length === 0 && !state.isStreaming;

  if (isEmpty) {
    messagesEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><img src="../icons/icon-128.png" width="48" height="48" style="border-radius:12px" /></div>
        <div class="empty-text">It looks like you're browsing something.<br>
          <span style="color:rgba(228,228,239,0.7)">Want help with that?</span></div>
        <div class="empty-hint">I can see your current tab. Just ask.</div>
      </div>`;
    return;
  }

  let html = '';
  for (const msg of state.messages) {
    const cls = msg.role === 'user' ? 'msg-user' : msg.role === 'error' ? 'msg-error' : 'msg-assistant';
    html += `<div class="msg ${cls}">${formatMarkdown(msg.content)}</div>`;
  }

  if (state.isStreaming) {
    if (state.streamingText) {
      html += `<div class="msg msg-assistant msg-streaming">${formatMarkdown(stripTags(state.streamingText))}</div>`;
    } else {
      html += `<div class="msg msg-assistant" style="display:flex;align-items:center;gap:8px">
           <img src="../icons/blepper-animated.gif" width="28" height="28" style="border-radius:8px" />
           <div class="typing"><span></span><span></span><span></span></div>
         </div>`;
    }
  }

  messagesEl.innerHTML = html;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ── Screenshot toggle ────────────────────────────────────

screenshotToggle.addEventListener('click', () => {
  state.autoScreenshot = !state.autoScreenshot;
  screenshotToggle.classList.toggle('active', state.autoScreenshot);
  screenshotStatus.textContent = state.autoScreenshot ? '📷 Screen visible' : '📷 Screen hidden';
  persist();
});

// ── Models panel ─────────────────────────────────────────

function renderModels() {
  const providerList = $('#provider-list');
  const modelList = $('#model-list');

  providerList.innerHTML = PROVIDERS.map(p => `
    <button class="card ${state.provider === p.id ? 'active' : ''}" data-provider="${p.id}">
      <span class="card-icon">${p.emoji}</span>
      <div class="card-body">
        <div class="card-title">${p.name}</div>
        <div class="card-sub">${p.requiresKey ? p.models.length + ' models' : 'Local — no key'}</div>
      </div>
      ${state.provider === p.id ? '<div class="card-dot"></div>' : ''}
    </button>
  `).join('');

  providerList.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      state.provider = card.dataset.provider;
      const prov = PROVIDERS.find(p => p.id === state.provider);
      state.model = prov.models[0].id;
      persist();
      renderModels();
    });
  });

  const prov = PROVIDERS.find(p => p.id === state.provider);
  modelList.innerHTML = prov.models.map(m => `
    <button class="card ${state.model === m.id ? 'active' : ''}" data-model="${m.id}">
      <div class="card-body">
        <div class="card-title">${m.name}</div>
        <div class="card-sub" style="font-family:'JetBrains Mono',monospace">${m.id}</div>
      </div>
      ${m.vision ? '<span class="card-badge">👁 Vision</span>' : ''}
      ${state.model === m.id ? '<div class="card-dot"></div>' : ''}
    </button>
  `).join('');

  modelList.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      state.model = card.dataset.model;
      persist();
      renderModels();
    });
  });
}

// ── Keys panel ───────────────────────────────────────────

function renderKeys() {
  const keysList = $('#keys-list');
  keysList.innerHTML = '';

  PROVIDERS.filter(p => p.requiresKey).forEach(p => {
    const section = document.createElement('div');
    section.className = 'key-section';
    section.innerHTML = `
      <label>${p.name}</label>
      <div class="key-row">
        <input type="password" class="key-input" data-provider="${p.id}" placeholder="${p.placeholder}">
        <button class="key-save" data-provider="${p.id}">Save</button>
      </div>
      <div class="key-hint">${p.hint}</div>
    `;
    keysList.appendChild(section);
  });

  // Load saved keys
  chrome.storage.local.get(['keys'], (data) => {
    const keys = data.keys || {};
    keysList.querySelectorAll('.key-input').forEach(input => {
      const pid = input.dataset.provider;
      if (keys[pid]) {
        input.value = keys[pid];
        input.nextElementSibling.textContent = 'Saved ✓';
      }
    });
  });

  // Save handlers
  keysList.querySelectorAll('.key-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.provider;
      const input = keysList.querySelector(`.key-input[data-provider="${pid}"]`);
      const key = input.value.trim();
      if (!key) return;

      chrome.storage.local.get(['keys'], (data) => {
        const keys = data.keys || {};
        keys[pid] = key;
        chrome.storage.local.set({ keys }, () => {
          btn.textContent = 'Saved ✓';
          setTimeout(() => { btn.textContent = 'Save'; }, 2000);
        });
      });
    });
  });
}

renderKeys();

// ── Buddies panel ────────────────────────────────────────

function renderBuddies() {
  const list = $('#buddies-list');
  list.innerHTML = state.buddies.map(b => `
    <button class="card ${state.activeBuddyId === b.id ? 'active' : ''}" data-buddy="${b.id}">
      <span class="card-icon">${b.emoji}</span>
      <div class="card-body">
        <div class="card-title">${b.name}</div>
        <div class="card-sub">${b.desc}</div>
      </div>
      ${state.activeBuddyId === b.id ? '<div class="card-dot" style="animation:blink 2s infinite"></div>' : ''}
    </button>
  `).join('');

  list.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      state.activeBuddyId = card.dataset.buddy;
      persist();
      renderBuddies();
      updateBuddyIndicator();
    });
  });
}

function updateBuddyIndicator() {
  const buddy = state.buddies.find(b => b.id === state.activeBuddyId);
  buddyIndicator.textContent = buddy?.emoji || '🐱';
  buddyIndicator.title = `Active: ${buddy?.name || 'Blepper'}`;
}

// ── Skills panel ─────────────────────────────────────────

function renderSkills() {
  const list = $('#skills-list');
  if (!list) return;

  list.innerHTML = BUILT_IN_SKILLS.map(skill => {
    const isActive = state.activeSkills.includes(skill.id);
    return `
      <button class="card ${isActive ? 'active' : ''}" data-skill="${skill.id}">
        <span class="card-icon">${skill.emoji}</span>
        <div class="card-body">
          <div class="card-title">${skill.name}</div>
          <div class="card-sub">${skill.desc}</div>
        </div>
        <div style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${isActive ? 'var(--c-accent)' : 'var(--c-border)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:var(--c-accent)">
          ${isActive ? '✓' : ''}
        </div>
      </button>`;
  }).join('');

  // Active skills indicator
  const countEl = $('#skills-count');
  if (countEl) {
    countEl.textContent = state.activeSkills.length > 0
      ? `${state.activeSkills.length} active`
      : 'None active';
  }

  list.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.skill;
      if (state.activeSkills.includes(id)) {
        state.activeSkills = state.activeSkills.filter(s => s !== id);
      } else {
        state.activeSkills.push(id);
      }
      persist();
      renderSkills();
    });
  });
}

// ── Init ─────────────────────────────────────────────────

renderModels();
renderBuddies();
renderSkills();
updateBuddyIndicator();
inputEl.focus();
