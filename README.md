# 📎 Blepper

**The AI cursor companion nobody asked for. But this time, it actually helps.**

An AI buddy that sees your screen, chats with you, and points at things while explaining them. BYOK (Bring Your Own Key). Works with Claude, GPT, Gemini, Ollama, and LM Studio.

---

## Three Ways to Run It

### 🧩 [Chrome Extension](packages/extension/) — Zero Build Step
Side panel + page overlay. Load it unpacked in `chrome://extensions/` and go.

### 🖥️ [Desktop App](packages/desktop/) — Electron
Full-featured desktop companion with transparent overlay, global hotkey, encrypted key storage.
```bash
cd packages/desktop && npm install && npm run electron:dev
```

### 🌐 [Web Widget](packages/web-inject/) — Script Tag
Drop a `<script>` tag on any page for an instant floating Blepper chat. No install.

---

## Features

- **Screen awareness** — captures screenshots and sends them to your LLM
- **Annotations** — animated pointers, highlights, arrows, and circles drawn on top of your screen/page
- **BYOK** — bring your own API key. Claude, OpenAI, Gemini, Ollama, LM Studio
- **Streaming** — real-time responses with live overlay animations
- **Multiple buddies** — swap between personas (code reviewer, design critic, tutor) or create your own
- **Cross-platform** — Mac, Windows, Linux (desktop), any Chromium browser (extension)

## How It Works

1. You type a question
2. Blepper screenshots your screen (or current tab)
3. Both are sent to your chosen LLM
4. The AI responds, embedding annotation tags like `[POINT:450,200:This button]`
5. The overlay renders an animated glowing cursor that flies to that spot

The AI can point at things (`[POINT]`), draw highlight boxes (`[HIGHLIGHT]`), draw arrows (`[ARROW]`), and circle elements (`[CIRCLE]`).

## Buddies

| Buddy | Role |
|-------|------|
| 📎 **Blepper** | All-purpose companion |
| 🔍 **Nitpick** | Code reviewer — direct, constructive, will roast bad code |
| 🎨 **Pixel** | UI/UX design critic — cares about spacing, contrast, hierarchy |
| 🎓 **Prof** | Patient tutor — points at everything, celebrates progress |
| 🤖 **Custom** | Build your own with any system prompt |

## Supported Providers

| Provider | Vision | Streaming | Key Required |
|----------|--------|-----------|-------------|
| Claude (Anthropic) | ✅ | ✅ | Yes |
| GPT-4o (OpenAI) | ✅ | ✅ | Yes |
| Gemini (Google) | ✅ | ✅ | Yes |
| Ollama (local) | ✅ | ✅ | No |
| LM Studio (local) | ✅ | ✅ | No |

## Tech

- **Desktop**: Electron 33+ · Vite · React · TypeScript · Zustand · Tailwind CSS
- **Extension**: Manifest V3 · Vanilla JS · Chrome Side Panel API · Zero dependencies
- **Web Widget**: Single IIFE script · No dependencies · ~15KB

## Inspired By

Built as a cross-platform, BYOK alternative to [farzaa/clicky](https://github.com/farzaa/clicky) (macOS-only, closed source) and [CursorBuddy](https://x.com/jasonkneen) (multi-platform, feature-rich).

## License

MIT

---

*Built with love and a deep appreciation for the most hated office assistant in computing history.*
