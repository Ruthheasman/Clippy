/**
 * Blepper Extension — Background Service Worker
 *
 * Responsibilities:
 * - Screenshot capture via chrome.tabs.captureVisibleTab
 * - LLM API calls (streaming)
 * - Message routing between side panel ↔ content script
 * - Storage management for API keys + config
 * - Skill knowledge injection
 */

importScripts('../shared/skills.js');

// ── Config defaults ──────────────────────────────────────

const DEFAULT_CONFIG = {
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  autoScreenshot: true,
  activeBuddyId: 'blepper',
  ollamaUrl: 'http://localhost:11434',
  lmstudioUrl: 'http://localhost:1234/v1',
};

// ── Skills system ────────────────────────────────────────

const BlepperSkills = {
  cache: {},

  async loadSkill(skillId) {
    if (this.cache[skillId]) return this.cache[skillId];

    try {
      // Load skill.json to get file list
      const metaUrl = chrome.runtime.getURL(`skills/${skillId}/skill.json`);
      const metaRes = await fetch(metaUrl);
      const meta = await metaRes.json();

      // Load each markdown file
      const contents = [];
      for (const file of meta.files) {
        const fileUrl = chrome.runtime.getURL(`skills/${skillId}/${file}`);
        const fileRes = await fetch(fileUrl);
        const text = await fileRes.text();
        contents.push(text);
      }

      const combined = contents.join('\n\n---\n\n');
      this.cache[skillId] = combined;
      return combined;
    } catch (err) {
      console.warn(`Failed to load skill ${skillId}:`, err);
      return '';
    }
  },

  async buildSkillContext(skillIds) {
    if (!skillIds || skillIds.length === 0) return '';

    const parts = [];
    for (const id of skillIds) {
      const content = await this.loadSkill(id);
      if (content) parts.push(content);
    }

    if (parts.length === 0) return '';
    return '\n\nREFERENCE KNOWLEDGE:\n' + parts.join('\n\n---\n\n');
  },
};

// ── Side panel setup ─────────────────────────────────────

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Also allow opening from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'open-sidepanel') {
    chrome.sidePanel.open({ windowId: message.windowId });
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'capture-screenshot') {
    handleScreenshot(message.tabId).then(sendResponse);
    return true; // async response
  }

  if (message.type === 'chat') {
    handleChat(message.params).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // async response
  }

  if (message.type === 'overlay-command') {
    // Forward annotation commands to the content script on the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'overlay-command',
          command: message.command,
        });
      }
    });
    return;
  }

  if (message.type === 'clear-overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'clear-overlay' });
      }
    });
    return;
  }
});

// ── Screenshot ───────────────────────────────────────────

async function handleScreenshot(tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'jpeg',
      quality: 80,
    });
    return { image: dataUrl };
  } catch (err) {
    console.error('Screenshot failed:', err);
    return null;
  }
}

// ── LLM Chat ─────────────────────────────────────────────

async function handleChat(params) {
  const { provider, model, messages, screenshot, buddyPrompt, skillIds } = params;

  // Get API key from storage
  const storage = await chrome.storage.local.get(['keys', 'ollamaUrl', 'lmstudioUrl']);
  const keys = storage.keys || {};
  const apiKey = keys[provider] || '';
  const ollamaUrl = storage.ollamaUrl || DEFAULT_CONFIG.ollamaUrl;
  const lmstudioUrl = storage.lmstudioUrl || DEFAULT_CONFIG.lmstudioUrl;

  if (!apiKey && !['ollama', 'lmstudio'].includes(provider)) {
    return { error: `No API key for ${provider}. Add one in the Keys panel.` };
  }

  // Build skill context from active skills
  const skillContext = (skillIds && skillIds.length > 0)
    ? await BlepperSkills.buildSkillContext(skillIds)
    : '';

  const systemPrompt = buddyPrompt
    ? `${buddyPrompt}${skillContext}\n\n${ANNOTATION_INSTRUCTIONS}`
    : `${SYSTEM_PROMPT}${skillContext}`;

  try {
    const stream = chatStream({
      provider, model, messages, screenshot, apiKey,
      systemPrompt, ollamaUrl, lmstudioUrl,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk;
      const chunkMsg = {
        type: 'chat-chunk',
        text: chunk,
        done: false,
        fullText: fullResponse,
      };
      // Send to side panel
      chrome.runtime.sendMessage(chunkMsg).catch(() => {});
      // Send to active tab's content script for overlay
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, chunkMsg).catch(() => {});
        }
      });
    }

    // Signal done
    const doneMsg = {
      type: 'chat-chunk',
      text: '',
      done: true,
      fullText: fullResponse,
    };
    chrome.runtime.sendMessage(doneMsg).catch(() => {});
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, doneMsg).catch(() => {});
      }
    });

    return { success: true };
  } catch (err) {
    return { error: err.message || 'LLM request failed' };
  }
}

// ── Streaming adapters ───────────────────────────────────

async function* chatStream(params) {
  const { provider, model, messages, screenshot, apiKey, systemPrompt, ollamaUrl, lmstudioUrl } = params;

  if (provider === 'claude') {
    yield* claudeStream(model, messages, screenshot, apiKey, systemPrompt);
  } else if (provider === 'openai') {
    yield* openaiStream(model, messages, screenshot, apiKey, systemPrompt);
  } else if (provider === 'gemini') {
    yield* geminiStream(model, messages, screenshot, apiKey, systemPrompt);
  } else if (provider === 'ollama') {
    yield* ollamaStream(model, messages, screenshot, systemPrompt, ollamaUrl);
  } else if (provider === 'lmstudio') {
    yield* lmstudioStream(model, messages, screenshot, systemPrompt, lmstudioUrl);
  }
}

async function* claudeStream(model, messages, screenshot, apiKey, systemPrompt) {
  const apiMessages = messages.map((m, i) => {
    const content = [];
    if (m.role === 'user' && i === messages.length - 1 && screenshot) {
      const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } });
    }
    content.push({ type: 'text', text: m.content });
    return { role: m.role, content };
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: apiMessages, stream: true }),
  });

  if (!res.ok) throw new Error(`Claude: ${res.status} ${await res.text()}`);
  yield* parseSSE(res.body, (evt) => {
    if (evt.type === 'content_block_delta') return evt.delta?.text || '';
    return '';
  });
}

async function* openaiStream(model, messages, screenshot, apiKey, systemPrompt) {
  const apiMessages = [{ role: 'system', content: systemPrompt }];
  messages.forEach((m, i) => {
    if (m.role === 'user' && i === messages.length - 1 && screenshot) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: screenshot, detail: 'high' } },
          { type: 'text', text: m.content },
        ],
      });
    } else {
      apiMessages.push({ role: m.role, content: m.content });
    }
  });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: apiMessages, max_tokens: 4096, stream: true }),
  });

  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  yield* parseSSE(res.body, (evt) => evt.choices?.[0]?.delta?.content || '');
}

async function* geminiStream(model, messages, screenshot, apiKey, systemPrompt) {
  const contents = messages.map((m, i) => {
    const parts = [];
    if (m.role === 'user' && i === messages.length - 1 && screenshot) {
      const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '');
      parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64 } });
    }
    parts.push({ text: m.content });
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

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

  if (!res.ok) throw new Error(`Gemini: ${res.status} ${await res.text()}`);
  yield* parseSSE(res.body, (evt) => evt.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

async function* ollamaStream(model, messages, screenshot, systemPrompt, baseUrl) {
  const ollamaMessages = [{ role: 'system', content: systemPrompt }];
  messages.forEach((m, i) => {
    const entry = { role: m.role, content: m.content };
    if (m.role === 'user' && i === messages.length - 1 && screenshot) {
      entry.images = [screenshot.replace(/^data:image\/\w+;base64,/, '')];
    }
    ollamaMessages.push(entry);
  });

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: ollamaMessages, stream: true }),
  });

  if (!res.ok) throw new Error(`Ollama: ${res.status}`);
  yield* parseNDJSON(res.body, (evt) => evt.message?.content || '');
}

async function* lmstudioStream(model, messages, screenshot, systemPrompt, baseUrl) {
  const apiMessages = [{ role: 'system', content: systemPrompt }];
  messages.forEach((m, i) => {
    if (m.role === 'user' && i === messages.length - 1 && screenshot) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: screenshot } },
          { type: 'text', text: m.content },
        ],
      });
    } else {
      apiMessages.push({ role: m.role, content: m.content });
    }
  });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model === 'loaded-model' ? '' : model, messages: apiMessages, max_tokens: 4096, stream: true }),
  });

  if (!res.ok) throw new Error(`LM Studio: ${res.status}`);
  yield* parseSSE(res.body, (evt) => evt.choices?.[0]?.delta?.content || '');
}

// ── Stream parsers ───────────────────────────────────────

async function* parseSSE(body, extract) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const text = extract(JSON.parse(data));
        if (text) yield text;
      } catch {}
    }
  }
}

async function* parseNDJSON(body, extract) {
  const reader = body.getReader();
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
        const text = extract(JSON.parse(line));
        if (text) yield text;
      } catch {}
    }
  }
}

// ── System Prompt ────────────────────────────────────────

const ANNOTATION_INSTRUCTIONS = `ANNOTATION INSTRUCTIONS:
When you want to draw attention to something on the page, embed these tags
in your response (they will be parsed and animated as an overlay on the page):

- [POINT:x,y:label] — Point at coordinates (x,y) with a label
- [HIGHLIGHT:x,y,width,height:label] — Highlight a rectangular region
- [ARROW:x1,y1,x2,y2:label] — Draw an arrow from (x1,y1) to (x2,y2)
- [CIRCLE:x,y,radius:label] — Circle an area at (x,y) with given radius

Coordinates are relative to the screenshot dimensions (viewport pixels).
Use annotations sparingly and precisely — only when it genuinely helps.

RULES:
- Be concise. Short paragraphs, not walls of text.
- Use annotations when showing is better than telling.
- If you can't identify what the user is asking about, say so.
- You can see their screen but you CANNOT interact with the page.
- For code suggestions, use markdown code blocks.`;

const SYSTEM_PROMPT = `You are Blepper, a friendly AI assistant that lives in the user's browser.
You can see their current tab via screenshots attached to their messages.

Your personality: helpful, slightly cheeky, knowledgeable. You're a
cheeky little cat AI who actually knows what it's doing.
Keep responses concise — you're a buddy, not a lecturer.

${ANNOTATION_INSTRUCTIONS}`;
