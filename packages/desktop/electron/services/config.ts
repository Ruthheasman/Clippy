import Store from 'electron-store';
import { safeStorage } from 'electron';
import type { LLMProvider } from '../llm/types';

interface ConfigSchema {
  accentColor: string;
  autoScreenshot: boolean;
  screenshotQuality: number;
  lastProvider: LLMProvider;
  lastModel: string;
  ollamaUrl: string;
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  // API keys stored encrypted
  keys: Record<string, string>;
}

const defaults: ConfigSchema = {
  accentColor: '#00d4ff',
  autoScreenshot: true,
  screenshotQuality: 80,
  lastProvider: 'claude',
  lastModel: 'claude-sonnet-4-20250514',
  ollamaUrl: 'http://localhost:11434',
  windowBounds: null,
  keys: {},
};

export class ConfigService {
  private store: Store<ConfigSchema>;

  constructor() {
    this.store = new Store<ConfigSchema>({ defaults });
  }

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.store.get(key);
  }

  set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
    this.store.set(key, value);
  }

  getApiKey(provider: LLMProvider): string | null {
    const keys = this.store.get('keys');
    const encrypted = keys[provider];
    if (!encrypted) return null;

    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(encrypted, 'base64');
        return safeStorage.decryptString(buffer);
      }
      // Fallback: stored as plain text (less secure but functional)
      return encrypted;
    } catch {
      return null;
    }
  }

  setApiKey(provider: LLMProvider, key: string): void {
    const keys = this.store.get('keys');

    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key);
      keys[provider] = encrypted.toString('base64');
    } else {
      // Fallback
      keys[provider] = key;
    }

    this.store.set('keys', keys);
  }
}
