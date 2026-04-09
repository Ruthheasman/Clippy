import type { LLMAdapter, LLMProvider } from './types';
import { ClaudeAdapter } from './claude';
import { OpenAIAdapter } from './openai';
import { GeminiAdapter } from './gemini';
import { OllamaAdapter } from './ollama';
import { LMStudioAdapter } from './lmstudio';

const adapters: Record<LLMProvider, () => LLMAdapter> = {
  claude: () => new ClaudeAdapter(),
  openai: () => new OpenAIAdapter(),
  gemini: () => new GeminiAdapter(),
  ollama: () => new OllamaAdapter(),
  lmstudio: () => new LMStudioAdapter(),
};

export function createLLMAdapter(provider: LLMProvider): LLMAdapter {
  const factory = adapters[provider];
  if (!factory) throw new Error(`Unknown provider: ${provider}`);
  return factory();
}
