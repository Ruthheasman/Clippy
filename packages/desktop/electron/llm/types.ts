export type LLMProvider = 'claude' | 'openai' | 'gemini' | 'ollama' | 'lmstudio';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  screenshot?: string; // base64 data URL
}

export interface ChatParams {
  model: string;
  messages: Message[];
  systemPrompt: string;
  screenshot?: string;
  apiKey: string;
  stream: boolean;
}

export interface StreamChunk {
  text: string;
  done: boolean;
}

export interface LLMAdapter {
  id: LLMProvider;
  name: string;
  models: { id: string; name: string; vision: boolean }[];
  requiresKey: boolean;

  chat(params: ChatParams): AsyncGenerator<StreamChunk>;
  validateKey(key: string): Promise<boolean>;
}

export interface ProviderInfo {
  id: LLMProvider;
  name: string;
  models: { id: string; name: string; vision: boolean }[];
  requiresKey: boolean;
  keyPlaceholder: string;
  keyHint: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'claude',
    name: 'Anthropic (Claude)',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', vision: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', vision: true },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', vision: true },
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-ant-...',
    keyHint: 'Get your key at console.anthropic.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', vision: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', vision: true },
      { id: 'gpt-4.1', name: 'GPT-4.1', vision: true },
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    keyHint: 'Get your key at platform.openai.com',
  },
  {
    id: 'gemini',
    name: 'Google (Gemini)',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', vision: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', vision: true },
    ],
    requiresKey: true,
    keyPlaceholder: 'AIza...',
    keyHint: 'Get your key at aistudio.google.com',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    models: [
      { id: 'llava', name: 'LLaVA (Vision)', vision: true },
      { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', vision: true },
      { id: 'llama3.2', name: 'Llama 3.2', vision: false },
    ],
    requiresKey: false,
    keyPlaceholder: '',
    keyHint: 'Make sure Ollama is running on localhost:11434',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    models: [
      { id: 'loaded-model', name: 'Currently Loaded Model', vision: true },
    ],
    requiresKey: false,
    keyPlaceholder: '',
    keyHint: 'Make sure LM Studio is running with a model loaded (localhost:1234)',
  },
];
