# 📎 Clippy

**The AI cursor companion nobody asked for. But this time, it actually helps.**

An AI buddy that lives next to your cursor, sees your screen, and points at things while explaining them. Cross-platform. BYOK (Bring Your Own Key). No Xcode required.

Inspired by [farzaa/clicky](https://github.com/farzaa/clicky), rebuilt from scratch in Electron + React + TypeScript to run everywhere.

## Features

- **Screen awareness** — captures screenshots and sends them to your LLM
- **Pointing & highlighting** — animated overlay cursor that flies to UI elements
- **BYOK** — bring your own API key for Claude, OpenAI, Gemini, or use Ollama locally
- **Streaming** — real-time streamed responses with live overlay animations
- **Cross-platform** — Mac, Windows, Linux from one codebase
- **Private** — keys encrypted via OS keychain, screenshots never stored

## Quick Start

```bash
# Clone
git clone https://github.com/your-username/clippy.git
cd clippy

# Install
npm install

# Dev mode
npm run electron:dev
```

Then open Settings (⚙ icon), paste your API key, pick a model, and start chatting.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘⇧C` / `Ctrl+Shift+C` | Toggle Clippy window |
| `Enter` | Send message |
| `Shift+Enter` | New line |

## Supported Providers

| Provider | Vision | Streaming | Key Required |
|----------|--------|-----------|-------------|
| **Claude** (Anthropic) | ✅ | ✅ | Yes |
| **GPT-4o** (OpenAI) | ✅ | ✅ | Yes |
| **Gemini** (Google) | ✅ | ✅ | Yes |
| **Ollama** (Local) | ✅ | ✅ | No |

## How Pointing Works

The LLM receives a screenshot with each message. When it wants to draw attention to something on screen, it embeds tags like `[POINT:x,y:label]` in its response. The overlay window parses these in real-time and animates a glowing pointer to the target coordinates.

## Tech Stack

Electron · Vite · React · TypeScript · Zustand · Tailwind CSS · Framer Motion

## Building

```bash
npm run electron:build
```

Outputs platform-specific builds to `release/`.

## Roadmap

- [ ] Multi-monitor support
- [ ] Conversation history (local SQLite)
- [ ] Voice input (push-to-talk)
- [ ] TTS output (ElevenLabs / browser fallback)
- [ ] OCR pre-processing for smarter pointing
- [ ] Draw mode (arrows, circles, annotations)
- [ ] BSV micropayments for keyless usage

---

*Built with love and a deep appreciation for the most hated office assistant in computing history.*
