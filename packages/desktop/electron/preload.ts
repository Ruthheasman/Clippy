import { contextBridge, ipcRenderer } from 'electron';
import type { LLMProvider, Message } from './llm/types';

contextBridge.exposeInMainWorld('clippy', {
  // Screenshot
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),

  // Chat
  chat: (params: {
    provider: LLMProvider;
    model: string;
    messages: Message[];
    screenshot?: string;
  }) => ipcRenderer.invoke('chat', params),

  onChatChunk: (callback: (chunk: { text: string; done: boolean; fullText?: string }) => void) => {
    const handler = (_event: any, chunk: any) => callback(chunk);
    ipcRenderer.on('chat-chunk', handler);
    return () => ipcRenderer.removeListener('chat-chunk', handler);
  },

  // Config
  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),
  getApiKey: (provider: LLMProvider) => ipcRenderer.invoke('get-api-key', provider),
  setApiKey: (provider: LLMProvider, key: string) => ipcRenderer.invoke('set-api-key', provider, key),
  validateApiKey: (provider: LLMProvider, key: string) => ipcRenderer.invoke('validate-api-key', provider, key),

  // Overlay
  pointAt: (data: { x: number; y: number; label: string }) => ipcRenderer.send('point-at', data),
  highlight: (data: { x: number; y: number; w: number; h: number; label: string }) => ipcRenderer.send('highlight', data),
  clearOverlay: () => ipcRenderer.send('clear-overlay'),

  // Overlay listeners (for overlay window)
  onPointAt: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('point-at', handler);
    return () => ipcRenderer.removeListener('point-at', handler);
  },
  onHighlight: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('highlight', handler);
    return () => ipcRenderer.removeListener('highlight', handler);
  },
  onClearOverlay: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('clear-overlay', handler);
    return () => ipcRenderer.removeListener('clear-overlay', handler);
  },
});
