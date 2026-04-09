# Clippy — AI Cursor Companion

**The spiritual successor nobody asked for. But this time, it actually helps.**

> An AI buddy that lives next to your cursor, sees your screen, and points at things while explaining them. Cross-platform. BYOK. No Xcode required.

---

## 1. What Is This?

Clippy is a desktop AI companion that:

- **Sees your screen** via screenshots (Electron `desktopCapturer`)
- **Chats with you** via a floating panel you can drag anywhere
- **Points at things** by animating an overlay cursor/highlight to specific UI elements
- **Works with any LLM** — bring your own API key (Claude, OpenAI, Gemini, or local Ollama)

Think of it as Clicky (farzaa's macOS Swift app) rebuilt from scratch in Electron + React + TypeScript, cross-platform from day one, with a BYOK model and smarter pointing.

---

## 2. Why Electron?

| Concern | Answer |
|---|---|
| Cross-platform | Mac, Windows, Linux from one codebase |
| Screen capture | `desktopCapturer` API — native, no deps |
| Transparent overlay | `BrowserWindow` with `transparent: true`, `setIgnoreMouseEvents(true)` |
| Your stack | Vite + React + TypeScript. Already home. |
| Replit-friendly | The renderer and UI layer can be prototyped on Replit, Electron shell added locally |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────┐
│                  ELECTRON MAIN                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Screenshot│  │  Config  │  │  LLM Adapter  │  │
│  │  Service  │  │  Store   │  │    Layer      │  │
│  │(capturer) │  │(electron │  │(Claude/GPT/   │  │
│  │           │  │  -store) │  │ Gemini/Ollama)│  │
│  └─────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│        │              │               │           │
│        └──────────────┼───────────────┘           │
│                       │ IPC                       │
├───────────────────────┼───────────────────────────┤
│                       │                           │
│  ┌────────────────────┼────────────────────────┐  │
│  │           RENDERER (React + Vite)           │  │
│  │                                              │  │
│  │  ┌────────────┐  ┌──────────────────────┐   │  │
│  │  │  Chat      │  │  Settings Panel      │   │  │
│  │  │  Panel     │  │  (BYOK, preferences) │   │  │
│  │  │  (floating)│  │                      │   │  │
│  │  └────────────┘  └──────────────────────┘   │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │         OVERLAY WINDOW (transparent)          │  │
│  │                                               │  │
│  │  • Animated cursor/pointer                    │  │
│  │  • Highlight regions (circles, arrows)        │  │
│  │  • Labels / callouts                          │  │
│  │  • Click-through (ignores mouse events)       │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Three Electron Windows

1. **Chat Panel** — `alwaysOnTop`, draggable, resizable. The main UI. React app.
2. **Overlay Window** — fullscreen, transparent, frameless, click-through. Renders pointing animations and highlights.
3. **Settings** — modal window spawned from chat panel. API keys, model selection, preferences.

---

## 4. BYOK — LLM Adapter Layer

The killer differentiator vs Clicky. A unified adapter interface:

```typescript
interface LLMAdapter {
  id: string;                    // 'claude' | 'openai' | 'gemini' | 'ollama'
  name: string;                  // Display name
  models: string[];              // Available model IDs
  requiresKey: boolean;          // false for Ollama
  
  chat(params: {
    model: string;
    messages: Message[];
    systemPrompt: string;
    screenshot?: string;         // base64
    stream: boolean;
  }): AsyncGenerator<StreamChunk>;
  
  validateKey(key: string): Promise<boolean>;
}
```

### Supported Providers (MVP)

| Provider | Vision? | Streaming? | Key Required? |
|----------|---------|------------|---------------|
| **Claude** (Anthropic) | Yes | Yes (SSE) | Yes |
| **OpenAI** (GPT-4o+) | Yes | Yes (SSE) | Yes |
| **Gemini** (Google) | Yes | Yes | Yes |
| **Ollama** (local) | Yes (llava etc) | Yes | No (localhost) |

### Unified Pointing Syntax

All providers receive this system prompt instruction:

```
When you want to point at something on the user's screen, embed a tag like this:
[POINT:x,y:label]

Where x,y are pixel coordinates relative to the screenshot dimensions, 
and label is a short description of what you're pointing at.

You can also highlight a region:
[HIGHLIGHT:x,y,width,height:label]

You can use multiple POINT and HIGHLIGHT tags in a single response.
```

The renderer parses these from the streamed response and animates the overlay in real-time as tokens arrive.

---

## 5. Screenshot Pipeline

```
User sends message
       │
       ▼
Capture all displays ─── desktopCapturer.getSources({ types: ['screen'] })
       │
       ▼
Resize to max 1920px wide (preserve aspect ratio, reduce token cost)
       │
       ▼
Convert to base64 PNG/JPEG
       │
       ▼
Attach to LLM request as image content
       │
       ▼
Store display geometry metadata (for coordinate mapping)
```

### Coordinate Mapping

The screenshot is resized before sending to the LLM, so the returned `[POINT:x,y]` coordinates are relative to the *resized* image. The overlay needs to map these back to actual screen pixels:

```typescript
function mapToScreen(point: Point, screenshotSize: Size, displayBounds: Rectangle): Point {
  const scaleX = displayBounds.width / screenshotSize.width;
  const scaleY = displayBounds.height / screenshotSize.height;
  return {
    x: displayBounds.x + (point.x * scaleX),
    y: displayBounds.y + (point.y * scaleY),
  };
}
```

---

## 6. Overlay System

The overlay is a transparent, frameless, always-on-top, click-through Electron window that spans the full screen (or all screens).

### Pointing Animation

When a `[POINT:x,y:label]` tag is parsed from the stream:

1. A stylised cursor/pointer element appears at the current position
2. It animates smoothly to the target `(x, y)` coordinates (spring physics, ~400ms)
3. A label bubble fades in near the target
4. A subtle pulse/glow effect highlights the area
5. After 3 seconds (or next point), it fades out or moves to the next target

### Highlight Animation

When a `[HIGHLIGHT:x,y,w,h:label]` tag is parsed:

1. A rounded rectangle with a glowing border draws around the region
2. The rest of the screen dims slightly (like a spotlight)
3. Label appears above/below the highlight

### Visual Style

- **Pointer**: Not a boring arrow. A playful, slightly oversized hand-pointer or dot with a comet trail
- **Highlight**: Neon glow border (user-configurable accent colour), frosted dim backdrop
- **Labels**: Rounded pill shape, semi-transparent dark background, clean sans-serif text
- **Motion**: Spring-based easing (not linear, not ease-in-out — *bouncy*)

---

## 7. Chat Panel UI

### Layout

```
┌──────────────────────────────────────┐
│ ◉ Clippy              ─ □ ×  │  ← Draggable title bar
│──────────────────────────────────────│
│                                      │
│  💬 Hey! I can see your screen.      │
│     What do you need help with?      │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ You: How do I add a gradient │    │
│  │ to this div?                 │    │
│  └──────────────────────────────┘    │
│                                      │
│  💬 I can see that div! Let me       │
│     show you...                      │
│     [cursor animates to element]     │
│                                      │
│──────────────────────────────────────│
│ ┌──────────────────────────────┐  ⚙  │
│ │ Ask me anything...           │  📷  │ ← Screenshot toggle
│ └──────────────────────────────┘     │
└──────────────────────────────────────┘
```

### Design Direction

- **Aesthetic**: Retro-meets-modern. Nod to the OG Clippy era but with contemporary polish
- **Font**: Distinctive display font for "Clippy" header, clean mono for code, readable sans for chat
- **Colour**: Dark mode default. Accent colour = electric blue (user-configurable)
- **Window**: Compact (320×480 default), resizable, remembers position
- **Personality**: The assistant responses should feel warm and slightly cheeky — it's Clippy after all

### Settings Panel

- **API Keys**: Secure input fields per provider (stored encrypted via electron-store + safeStorage)
- **Model Selection**: Dropdown per provider showing available models
- **Ollama URL**: Custom endpoint field (default `http://localhost:11434`)
- **Screenshot Quality**: JPEG quality slider (lower = faster/cheaper, higher = more accurate pointing)
- **Accent Colour**: Colour picker for overlay highlights
- **Hotkey**: Configurable global shortcut to toggle the panel
- **Auto-screenshot**: Toggle — auto-capture on every message vs manual camera button

---

## 8. Build Phases

### Phase 1 — MVP (This Build)

- [x] Electron + Vite + React + TypeScript scaffold
- [x] Floating chat panel (draggable, always-on-top)
- [x] Screenshot capture via `desktopCapturer`
- [x] LLM adapter layer with Claude, OpenAI, Gemini, Ollama
- [x] Streaming chat responses
- [x] `[POINT:x,y:label]` parsing from stream
- [x] Transparent overlay window with cursor animation
- [x] Settings panel with BYOK key storage
- [x] Global hotkey to toggle panel
- [x] Basic coordinate mapping (single monitor)
- [ ] **Sidebar navigation** — icon sidebar (Chat, Models, Keys, Settings, Buddies)
- [ ] **Web injection script** — zero-install bookmarklet/script tag for browser use
- [ ] **LM Studio support** — OpenAI-compatible local endpoint

### Phase 1.5 — CursorBuddy Parity

- [ ] **Extended overlay commands** — `[ARROW:x1,y1,x2,y2:label]`, `[CIRCLE:x,y,r:label]`
- [ ] **Multiple buddies** — configurable personas with different system prompts + skills
- [ ] **Draw & annotate mode** — full screen annotation (arrows, circles, freehand)
- [ ] **Themes** — dark/light/custom theme system
- [ ] **Playground mode** — test prompts and overlay commands without API calls

### Phase 2 — Intelligence

- [ ] `[HIGHLIGHT:x,y,w,h:label]` region highlighting
- [ ] Multi-monitor support (display detection + coordinate mapping)
- [ ] Conversation history (local SQLite via better-sqlite3)
- [ ] Context awareness (detect active window/app, adjust system prompt)
- [ ] OCR pre-processing (Tesseract.js) for smarter element labelling
- [ ] **MCP integration** — connect to MCP servers for agent tooling
- [ ] **CLI mode** — headless `clippy "question" < context.txt` for terminal workflows

### Phase 3 — Voice

- [ ] Push-to-talk via Web Audio API
- [ ] AssemblyAI real-time transcription (or Whisper local)
- [ ] ElevenLabs TTS playback (or browser SpeechSynthesis as free fallback)
- [ ] Voice activity detection
- [ ] **Time-coded voice-to-text** for natural streaming display

### Phase 4 — Power Features

- [ ] **Computer use** — AI can click, type, navigate (not just observe)
- [ ] **Plugin system** — custom adapters, overlay styles, tool extensions
- [ ] **Multiple canvas views** — different interaction surfaces
- [ ] Session memory + learning progress tracking
- [ ] BSV micropayment integration for pay-per-query with no API key needed 😏
- [ ] **Multi-player remote buddies** — shared sessions

---

## 9. Tech Stack

| Layer | Tech |
|-------|------|
| **Runtime** | Electron 33+ |
| **Bundler** | Vite |
| **UI** | React 18+ |
| **Language** | TypeScript (strict) |
| **State** | Zustand (lightweight, no boilerplate) |
| **Config** | electron-store (encrypted keys via safeStorage) |
| **Styling** | Tailwind CSS |
| **LLM Comms** | Native fetch + ReadableStream (no SDK deps) |
| **Screenshot** | Electron desktopCapturer |
| **Overlay Animation** | CSS transitions + Framer Motion |
| **Future: DB** | better-sqlite3 |
| **Future: OCR** | Tesseract.js |
| **Future: Voice** | Web Audio API + AssemblyAI/Whisper |

---

## 10. File Structure

```
clippy/
├── electron/
│   ├── main.ts                  # Electron main process
│   ├── preload.ts               # IPC bridge
│   ├── windows/
│   │   ├── chatWindow.ts        # Chat panel window config
│   │   ├── overlayWindow.ts     # Transparent overlay window config
│   │   └── settingsWindow.ts    # Settings modal
│   ├── services/
│   │   ├── screenshot.ts        # desktopCapturer wrapper
│   │   ├── config.ts            # electron-store + safeStorage
│   │   └── hotkey.ts            # Global shortcut registration
│   └── llm/
│       ├── types.ts             # LLMAdapter interface + shared types
│       ├── adapter.ts           # Provider router
│       ├── claude.ts            # Anthropic adapter
│       ├── openai.ts            # OpenAI adapter
│       ├── gemini.ts            # Google Gemini adapter
│       └── ollama.ts            # Ollama adapter
├── src/
│   ├── App.tsx                  # Chat panel React app
│   ├── main.tsx                 # React entry point
│   ├── components/
│   │   ├── ChatPanel.tsx        # Main chat interface
│   │   ├── MessageBubble.tsx    # Individual message rendering
│   │   ├── InputBar.tsx         # Message input + screenshot toggle
│   │   ├── TitleBar.tsx         # Custom draggable title bar
│   │   ├── Settings.tsx         # Settings panel
│   │   ├── ProviderSelect.tsx   # LLM provider/model picker
│   │   └── KeyInput.tsx         # Secure API key input
│   ├── overlay/
│   │   ├── OverlayApp.tsx       # Overlay React app (separate entry)
│   │   ├── Pointer.tsx          # Animated cursor/pointer
│   │   ├── Highlight.tsx        # Region highlight box
│   │   └── Label.tsx            # Floating label bubble
│   ├── hooks/
│   │   ├── useChat.ts           # Chat state + streaming
│   │   ├── useScreenshot.ts     # Screenshot capture trigger
│   │   └── useOverlay.ts        # Overlay command dispatch
│   ├── stores/
│   │   └── chatStore.ts         # Zustand store
│   ├── lib/
│   │   ├── parsePointing.ts     # Parse [POINT:] and [HIGHLIGHT:] from stream
│   │   ├── coordinateMap.ts     # Screenshot → screen coordinate mapping
│   │   └── streamParser.ts      # SSE/streaming response parser
│   └── styles/
│       └── globals.css          # Tailwind + custom properties
├── overlay/
│   ├── index.html               # Overlay window HTML entry
│   └── main.tsx                 # Overlay React entry
├── package.json
├── tsconfig.json
├── vite.config.ts               # Vite config for renderer
├── electron-builder.json        # Build/packaging config
├── CLAUDE.md                    # Agent instructions
└── README.md
```

---

## 11. System Prompt Template

```
You are Clippy, a friendly AI assistant that lives next to the user's cursor. 
You can see their screen via screenshots attached to their messages.

Your personality: helpful, slightly cheeky, knowledgeable. You're the 
reincarnation of the original Clippy, but you actually know what you're doing 
this time. Keep responses concise — you're a buddy, not a lecturer.

POINTING INSTRUCTIONS:
When you want to draw attention to something on screen, embed these tags 
in your response (they will be parsed and animated on the overlay):

- [POINT:x,y:label] — Point at pixel coordinates (x,y) with a label
- [HIGHLIGHT:x,y,width,height:label] — Highlight a rectangular region

Coordinates are relative to the screenshot dimensions provided.
Use pointing sparingly and precisely — only when it genuinely helps.

RULES:
- Be concise. Short paragraphs, not walls of text.
- Use POINT/HIGHLIGHT when showing is better than telling.
- If you can't identify what the user is asking about, say so.
- You can see the screenshot but you CANNOT interact with their computer.
- For code suggestions, use markdown code blocks.
```

---

## 12. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM coordinate accuracy is poor | Phase 2: OCR pre-processing to build element map, send structured labels not raw pixels |
| Overlay flickers on some platforms | Test early on all 3 OSes. Use `requestAnimationFrame` for smooth rendering |
| API key security | `safeStorage` encryption (OS keychain), never log keys, never send to analytics |
| Screenshot privacy concerns | Clear UX: show camera icon when capturing, option to exclude windows, no screenshots stored unless user opts in |
| Electron memory bloat | Lazy load overlay window, minimal deps, monitor with `process.memoryUsage()` |
| Rate limiting / cost with screenshots | JPEG compression slider, option to skip screenshot on follow-up messages, token usage display |

---

## 13. Success Metrics

- **It works on Mac, Windows, and Linux** without platform-specific forks
- **Time to first response** under 3 seconds (screenshot capture + LLM first token)
- **Pointing accuracy** — cursor lands within 50px of intended target >70% of the time
- **BYOK setup** takes under 60 seconds (paste key → select model → go)
- **Memory usage** stays under 300MB idle

---

*Built with spite, love, and a deep appreciation for the most hated office assistant in computing history.*
