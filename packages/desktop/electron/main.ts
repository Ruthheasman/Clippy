import { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer, nativeImage } from 'electron';
import path from 'path';
import { createChatWindow } from './windows/chatWindow';
import { createOverlayWindow } from './windows/overlayWindow';
import { ConfigService } from './services/config';
import { createLLMAdapter } from './llm/adapter';
import type { LLMProvider, Message } from './llm/types';

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

let chatWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let config: ConfigService;

async function createWindows() {
  config = new ConfigService();

  chatWindow = createChatWindow(isDev);
  overlayWindow = createOverlayWindow();

  // Register global hotkey (Cmd/Ctrl + Shift + C)
  const hotkey = process.platform === 'darwin' ? 'Command+Shift+C' : 'Control+Shift+C';
  globalShortcut.register(hotkey, () => {
    if (chatWindow?.isVisible()) {
      chatWindow.hide();
    } else {
      chatWindow?.show();
      chatWindow?.focus();
    }
  });
}

// ── IPC Handlers ──────────────────────────────────────────────

// Screenshot capture
ipcMain.handle('capture-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length === 0) return null;

    const primarySource = sources[0];
    const thumbnail = primarySource.thumbnail;

    // Get display info for coordinate mapping
    const primaryDisplay = screen.getPrimaryDisplay();

    return {
      image: thumbnail.toDataURL(),
      displayBounds: primaryDisplay.bounds,
      screenshotSize: thumbnail.getSize(),
    };
  } catch (err) {
    console.error('Screenshot capture failed:', err);
    return null;
  }
});

// Chat with LLM
ipcMain.handle('chat', async (event, params: {
  provider: LLMProvider;
  model: string;
  messages: Message[];
  screenshot?: string;
  buddyPrompt?: string;
}) => {
  const { provider, model, messages, screenshot, buddyPrompt } = params;
  const apiKey = config.getApiKey(provider);

  if (!apiKey && provider !== 'ollama' && provider !== 'lmstudio') {
    return { error: `No API key configured for ${provider}` };
  }

  const adapter = createLLMAdapter(provider);

  // Combine buddy-specific prompt with base annotation instructions
  const systemPrompt = buddyPrompt
    ? `${buddyPrompt}\n\n${ANNOTATION_INSTRUCTIONS}`
    : SYSTEM_PROMPT;

  try {
    // Collect the full response and send chunks via IPC
    let fullResponse = '';
    const stream = adapter.chat({
      model,
      messages,
      systemPrompt,
      screenshot,
      apiKey: apiKey || '',
      stream: true,
    });

    for await (const chunk of stream) {
      fullResponse += chunk.text;
      // Send each chunk to renderer
      chatWindow?.webContents.send('chat-chunk', {
        text: chunk.text,
        done: chunk.done,
      });
      // Also send to overlay for point parsing
      overlayWindow?.webContents.send('chat-chunk', {
        text: chunk.text,
        done: chunk.done,
        fullText: fullResponse,
      });
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'LLM request failed' };
  }
});

// Config management
ipcMain.handle('get-config', (_event, key: string) => {
  return config.get(key);
});

ipcMain.handle('set-config', (_event, key: string, value: any) => {
  config.set(key, value);
});

ipcMain.handle('get-api-key', (_event, provider: LLMProvider) => {
  return config.getApiKey(provider);
});

ipcMain.handle('set-api-key', (_event, provider: LLMProvider, key: string) => {
  config.setApiKey(provider, key);
});

ipcMain.handle('validate-api-key', async (_event, provider: LLMProvider, key: string) => {
  const adapter = createLLMAdapter(provider);
  return adapter.validateKey(key);
});

// Overlay commands
ipcMain.on('point-at', (_event, data: { x: number; y: number; label: string }) => {
  overlayWindow?.webContents.send('point-at', data);
});

ipcMain.on('highlight', (_event, data: { x: number; y: number; w: number; h: number; label: string }) => {
  overlayWindow?.webContents.send('highlight', data);
});

ipcMain.on('clear-overlay', () => {
  overlayWindow?.webContents.send('clear-overlay');
});

// ── System Prompt ─────────────────────────────────────────────

const ANNOTATION_INSTRUCTIONS = `ANNOTATION INSTRUCTIONS:
When you want to draw attention to something on screen, embed these tags
in your response (they will be parsed and animated on the overlay):

- [POINT:x,y:label] — Point at pixel coordinates (x,y) with a label
- [HIGHLIGHT:x,y,width,height:label] — Highlight a rectangular region
- [ARROW:x1,y1,x2,y2:label] — Draw an arrow from (x1,y1) to (x2,y2)
- [CIRCLE:x,y,radius:label] — Circle an area at (x,y) with given radius

Coordinates are relative to the screenshot dimensions provided.
Use annotations sparingly and precisely — only when it genuinely helps.

RULES:
- Be concise. Short paragraphs, not walls of text.
- Use annotations when showing is better than telling.
- If you can't identify what the user is asking about, say so.
- You can see the screenshot but you CANNOT interact with their computer.
- For code suggestions, use markdown code blocks.`;

const SYSTEM_PROMPT = `You are Clippy, a friendly AI assistant that lives next to the user's cursor.
You can see their screen via screenshots attached to their messages.

Your personality: helpful, slightly cheeky, knowledgeable. You're the
reincarnation of the original Clippy, but you actually know what you're doing
this time. Keep responses concise — you're a buddy, not a lecturer.

${ANNOTATION_INSTRUCTIONS}`;

// ── App Lifecycle ─────────────────────────────────────────────

app.whenReady().then(createWindows);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindows();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
