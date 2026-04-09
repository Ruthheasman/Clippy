# 📎 Clippy — Chrome Extension

**AI screen companion as a Chrome extension. Sees your tab, points at things, actually helps.**

No Electron. No build step. Just load it into Chrome and go.

## Install (Developer Mode)

1. Download/clone this folder
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select this `clippy-extension` folder
5. Click the Clippy icon in your toolbar → **Open Side Panel**
6. Go to the **Keys** tab, paste your API key
7. Go to the **Models** tab, pick a provider + model
8. Start chatting

## What It Does

- **Screenshots your current tab** when you send a message (toggle-able)
- **Sends it to your LLM** (Claude, GPT, Gemini, Ollama, LM Studio)
- **Streams the response** in a side panel
- **Draws annotations** on the page — pointers, highlights, arrows, circles
- **Multiple buddies** — Clippy (general), Nitpick (code review), Pixel (design), Prof (tutor)

## Architecture

```
manifest.json           ← Manifest V3 config
background/
  service-worker.js     ← Screenshot capture, LLM streaming, message routing
sidepanel/
  index.html + panel.js + panel.css  ← Main chat UI (Chrome side panel)
content/
  overlay.js + overlay.css           ← Page annotation overlay (injected everywhere)
popup/
  popup.html            ← Quick-launch popup
icons/                  ← Extension icons
```

Zero build step. No React, no bundler, no npm. Pure vanilla JS.
The side panel is intentionally framework-free so the extension stays tiny and loads instantly.

## Supported Providers

| Provider | Vision | Key Required |
|----------|--------|-------------|
| Claude (Anthropic) | ✅ | Yes |
| GPT-4o (OpenAI) | ✅ | Yes |
| Gemini (Google) | ✅ | Yes |
| Ollama (local) | ✅ | No |
| LM Studio (local) | ✅ | No |

## Annotation Commands

The LLM can embed these tags to draw on your page:

- `[POINT:x,y:label]` — Animated pointer
- `[HIGHLIGHT:x,y,w,h:label]` — Glowing rectangle
- `[ARROW:x1,y1,x2,y2:label]` — Animated arrow
- `[CIRCLE:x,y,r:label]` — Animated circle

---

Part of the [Clippy](../README.md) project. Built by Ruth Designs Digital.
