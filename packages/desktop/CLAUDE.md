# CLAUDE.md — Clippy

> The AI cursor companion nobody asked for. But this time, it actually helps.

## What is this?

Clippy is a cross-platform AI cursor companion. It captures screenshots of your screen, sends them to an LLM (BYOK — user brings their own API key), streams responses, and renders animated annotations (pointers, highlights, arrows, circles) as an overlay on top of your desktop.

It ships as:
1. **Desktop app** — Electron + Vite + React + TypeScript
2. **Web widget** — zero-install browser script tag (`web-inject/inject.js`)

## Architecture

```
┌─ Electron Main Process ──────────────────────────┐
│  main.ts          — IPC hub, system prompt, lifecycle
│  services/config  — encrypted key storage (OS keychain)
│  llm/adapter      — provider router
│  llm/claude       — Anthropic streaming + vision
│  llm/openai       — OpenAI streaming + vision
│  llm/gemini       — Google streaming + vision
│  llm/ollama       — Ollama local streaming + vision
│  llm/lmstudio     — LM Studio (OpenAI-compat, localhost:1234)
│  windows/         — chatWindow, overlayWindow configs
└───────────────────────────────────────────────────┘
        │ IPC (contextBridge via preload.ts)
        ▼
┌─ Renderer: Chat Panel (src/) ─────────────────────┐
│  Sidebar.tsx       — icon nav (Chat/Models/Keys/Buddies/Settings)
│  ChatPanel.tsx     — message list + streaming display
│  InputBar.tsx      — text input + screenshot toggle
│  ModelsPanel.tsx   — provider + model selection
│  KeysPanel.tsx     — BYOK key management with validation
│  BuddiesPanel.tsx  — persona selection + custom buddy builder
│  SettingsPanel.tsx  — preferences, shortcuts, web inject info
│  stores/chatStore  — Zustand state (messages, buddies, config)
│  lib/parsePointing — parses annotation tags from stream
│  lib/coordinateMap — screenshot-to-screen coordinate mapping
└───────────────────────────────────────────────────┘

┌─ Renderer: Overlay (overlay/) ────────────────────┐
│  OverlayApp.tsx    — transparent fullscreen, click-through
│                      renders: pointers, highlights, arrows, circles
│                      all with spring/draw animations + neon glow
└───────────────────────────────────────────────────┘

┌─ Web Widget (web-inject/) ────────────────────────┐
│  inject.js         — self-contained IIFE, no deps
│                      floating chat panel for any webpage
│                      BYOK, streaming, all 4 cloud providers + Ollama
│  test.html         — demo page
└───────────────────────────────────────────────────┘
```

## Annotation syntax

The LLM embeds these tags in responses. They are parsed in real-time by `parsePointing.ts` and rendered by the overlay:

| Tag | Example | What it does |
|-----|---------|--------------|
| `[POINT:x,y:label]` | `[POINT:450,200:This button]` | Animated pointer dot with label |
| `[HIGHLIGHT:x,y,w,h:label]` | `[HIGHLIGHT:100,100,300,50:Nav bar]` | Glowing rectangle highlight |
| `[ARROW:x1,y1,x2,y2:label]` | `[ARROW:100,100,400,300:Data flow]` | SVG arrow that draws itself |
| `[CIRCLE:x,y,r:label]` | `[CIRCLE:500,300,40:Click here]` | SVG circle that draws itself |

Coordinates are relative to the screenshot dimensions sent to the LLM. The overlay maps them back to screen pixels via `coordinateMap.ts`.

## Buddies (personas)

The app ships with 4 built-in buddies. Users can create custom ones.

| Buddy | Emoji | Role |
|-------|-------|------|
| Clippy | 📎 | All-purpose companion (default system prompt) |
| Nitpick | 🔍 | Code reviewer — direct, constructive, will roast bad code |
| Pixel | 🎨 | UI/UX design critic — cares about spacing, contrast, hierarchy |
| Prof | 🎓 | Patient tutor — points at everything, celebrates progress |

Each buddy has its own system prompt. The active buddy's prompt is prepended to the base annotation instructions. Custom buddies are created via the Buddies panel with emoji, name, description, and system prompt.

## LLM providers

| Provider | Adapter file | Vision | Key required | Endpoint |
|----------|-------------|--------|-------------|----------|
| Anthropic (Claude) | `claude.ts` | ✅ | Yes | api.anthropic.com |
| OpenAI | `openai.ts` | ✅ | Yes | api.openai.com |
| Google Gemini | `gemini.ts` | ✅ | Yes | generativelanguage.googleapis.com |
| Ollama | `ollama.ts` | ✅ | No | localhost:11434 |
| LM Studio | `lmstudio.ts` | ✅ | No | localhost:1234 |

All adapters implement the `LLMAdapter` interface from `types.ts`. All use raw `fetch` + `ReadableStream` — zero SDK dependencies. Vision support attaches base64 screenshots in each provider's native format.

## Commands

```bash
npm install             # Install dependencies
npm run electron:dev    # Dev mode (Vite HMR + Electron)
npm run electron:build  # Production build (platform-specific)
```

## Key files quick reference

| File | Purpose |
|------|---------|
| `electron/main.ts` | Main process, IPC handlers, system prompt, window lifecycle |
| `electron/preload.ts` | Secure IPC bridge (contextBridge) |
| `electron/llm/types.ts` | `LLMAdapter` interface, `PROVIDERS` registry |
| `electron/llm/adapter.ts` | Provider router — `createLLMAdapter(provider)` |
| `electron/services/config.ts` | `electron-store` + `safeStorage` for encrypted keys |
| `src/stores/chatStore.ts` | Zustand store — messages, buddies, panel state, config |
| `src/lib/parsePointing.ts` | Regex parser for all annotation tags |
| `src/lib/coordinateMap.ts` | Screenshot → screen pixel coordinate mapping |
| `src/components/Sidebar.tsx` | Icon navigation rail |
| `src/components/BuddiesPanel.tsx` | Persona selection + custom buddy builder |
| `overlay/OverlayApp.tsx` | Transparent overlay — renders all annotation types |
| `web-inject/inject.js` | Standalone browser widget (IIFE, no deps) |

## Stack

Electron 33+ · Vite 6 · React 18 · TypeScript (strict) · Zustand · Framer Motion · Tailwind CSS

## Design system

- **Aesthetic**: Dark glass — `rgba(10,10,15,0.88)` with `backdrop-filter: blur(24px)`
- **Fonts**: Outfit (display/headings), DM Sans (body), JetBrains Mono (code)
- **Accent**: Electric blue `#00d4ff` (user-configurable)
- **Overlay glow**: `rgba(0, 212, 255, 0.4)` with radial gradients and box-shadow pulses
- **Motion**: Spring-based pointer easing `cubic-bezier(0.34, 1.56, 0.64, 1)`, SVG dash animations for arrows/circles
- **Layout**: 380×520 compact panel, 48px sidebar, always-on-top
- **Anti-patterns**: No Inter, no Roboto, no purple gradients, no generic AI slop

## Project structure

```
clippy/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── windows/
│   │   ├── chatWindow.ts
│   │   └── overlayWindow.ts
│   ├── services/
│   │   └── config.ts
│   └── llm/
│       ├── types.ts
│       ├── adapter.ts
│       ├── claude.ts
│       ├── openai.ts
│       ├── gemini.ts
│       ├── ollama.ts
│       └── lmstudio.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── TitleBar.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── InputBar.tsx
│   │   ├── ModelsPanel.tsx
│   │   ├── KeysPanel.tsx
│   │   ├── BuddiesPanel.tsx
│   │   └── SettingsPanel.tsx
│   ├── hooks/
│   │   └── useChat.ts
│   ├── stores/
│   │   └── chatStore.ts
│   ├── lib/
│   │   ├── parsePointing.ts
│   │   └── coordinateMap.ts
│   └── styles/
│       └── globals.css
├── overlay/
│   ├── index.html
│   ├── main.tsx
│   └── OverlayApp.tsx
├── web-inject/
│   ├── inject.js
│   └── test.html
├── docs/
│   └── PRD.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```
