# 🐱 Blepper

**A cheeky cat AI that sees your screen, points at things, and actually helps.**

An AI screen companion that captures your screen, chats about what it sees, draws annotations, and — with the companion server — can interact with any desktop app. BYOK (Bring Your Own Key). Works with Claude, GPT, Gemini, Ollama, and LM Studio.

---

## Get Started

### 🧩 Chrome Extension — Start Here (Zero Install)

1. Download or clone this repo
2. Open Chrome → `chrome://extensions/` → **Developer mode** ON
3. Click **Load unpacked** → select `packages/extension`
4. Click the Blepper cat in your toolbar → **Open Side Panel**
5. Go to the **Keys** tab (🔑) → paste your API key
6. Go to **Chat** (💬) → ask it anything about the page you're on

That's it. No build step, no npm, no dependencies.

### 🐍 Companion Server — Supercharge It (Optional)

Adds fast UI element detection and desktop app interaction. Your AI can now *click things*.

**Requirements:** Python 3.10+

```bash
cd companion
pip install -r requirements.txt
python blepper-companion.py
```

You'll see:
```
🐱 Blepper Companion Server
════════════════════════════════════════
   OmniParser:  ❌ Not installed (optional)
   PyAutoGUI:   ✅ Ready
   Listening:   http://localhost:8765
════════════════════════════════════════
```

The Chrome extension auto-detects the companion. With it running, Blepper can:

- **Detect UI elements** in ~400ms via OmniParser V2 (optional, see [companion README](companion/README.md))
- **Click buttons, menus, checkboxes** in any desktop app
- **Type text** into any field
- **Press keyboard shortcuts** (Ctrl+S, Ctrl+Z, etc)
- **Drag, scroll, navigate** — all from natural language instructions
- **Take native screenshots** (faster than browser screen sharing)

All actions require your confirmation before execution. See [companion/README.md](companion/README.md) for full setup.

### 🖥️ Desktop App — Electron (Experimental)

Full desktop overlay version with transparent annotation window. Requires Node.js 18+.

```bash
cd packages/desktop && npm install && npm run electron:dev
```

---

## Features

| Feature | Extension | With Companion |
|---------|-----------|---------------|
| See your screen | ✅ (screen share) | ✅ (native capture) |
| Chat with LLM | ✅ | ✅ |
| Annotations on preview | ✅ | ✅ |
| Text attachments (paste code/errors) | ✅ | ✅ |
| Clipboard watcher | ✅ | ✅ |
| Multiple buddies | ✅ | ✅ |
| Skills (UE5, Web Dev) | ✅ | ✅ |
| UI element detection | ❌ | ✅ (~400ms) |
| Click/type/interact with apps | ❌ | ✅ |
| Native screenshots | ❌ | ✅ |

## How It Works

1. You share your screen (or the companion captures it natively)
2. You type a question, optionally paste code/errors alongside
3. Blepper sends the screenshot + text + question to your chosen LLM
4. The AI responds with annotation tags like `[POINT:450,200:This button]`
5. Animated pointers, highlights, arrows, and circles appear on the screen preview
6. With the companion: the AI can also `[CLICK:450,200]` to interact with your apps

## Buddies

Different personalities with different skills. Switch on the fly.

| Buddy | Role |
|-------|------|
| 🐱 **Blepper** | All-purpose screen companion |
| 🔍 **Nitpick** | Code reviewer — direct, constructive, will roast your spaghetti |
| 🎨 **Pixel** | UI/UX design critic — strong opinions on spacing |
| 🎓 **Prof** | Patient tutor — points at everything, celebrates progress |
| 🤖 **Custom** | Build your own with any system prompt |

## Skills

Domain knowledge packs that give your buddy expertise. Toggle on when working in that domain.

| Skill | What's In It |
|-------|-------------|
| 🎮 **Unreal Engine 5** | Blueprints (events, wire colours, patterns), Materials (nodes, shading models), Niagara VFX (emitter stages, modules, troubleshooting) |
| 🌐 **Web Development** | React + TypeScript (hooks, patterns, Zustand), Express + Node.js (routing, streaming, middleware), CSS + Tailwind (layout, responsive, debugging) |

## Supported Providers

| Provider | Vision | Streaming | Key Required |
|----------|--------|-----------|-------------|
| Claude (Anthropic) | ✅ | ✅ | Yes |
| GPT-4o (OpenAI) | ✅ | ✅ | Yes |
| Gemini (Google) | ✅ | ✅ | Yes |
| Ollama (local) | ✅ | ✅ | No |
| LM Studio (local) | ✅ | ✅ | No |

## Tech

- **Extension**: Manifest V3 · Vanilla JS · Chrome Side Panel API · Zero dependencies
- **Companion**: Python · Flask · PyAutoGUI · OmniParser V2 (optional)
- **Desktop**: Electron · Vite · React · TypeScript · Zustand · Tailwind CSS

## Repo Structure

```
├── packages/
│   ├── extension/        ← Chrome extension (start here)
│   ├── desktop/          ← Electron app (experimental)
│   └── web-inject/       ← Browser widget script
├── companion/            ← Python companion server
└── docs/
    └── PRD.md            ← Full product spec
```

## Inspired By

Built as a cross-platform, BYOK alternative to [farzaa/clicky](https://github.com/farzaa/clicky) and [CursorBuddy](https://x.com/jasonkneen).

## License

MIT

---

*Built by Ruth Designs Digital. The cheeky cat who looks over your shoulder, points at your mistakes, and occasionally knocks things off the desk.*
