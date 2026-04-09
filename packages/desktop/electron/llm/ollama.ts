import type { LLMAdapter, ChatParams, StreamChunk } from './types';

export class OllamaAdapter implements LLMAdapter {
  id = 'ollama' as const;
  name = 'Ollama (Local)';
  models = [
    { id: 'llava', name: 'LLaVA (Vision)', vision: true },
    { id: 'llama3.2-vision', name: 'Llama 3.2 Vision', vision: true },
    { id: 'llama3.2', name: 'Llama 3.2', vision: false },
  ];
  requiresKey = false;

  private baseUrl = 'http://localhost:11434';

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const { model, messages, systemPrompt, screenshot } = params;

    const ollamaMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLast = i === messages.length - 1;
      const entry: any = { role: msg.role, content: msg.content };

      if (msg.role === 'user' && isLast && screenshot) {
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        entry.images = [base64Data];
      }

      ollamaMessages.push(entry);
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama error (${response.status}): ${err}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.message?.content) {
            yield { text: event.message.content, done: false };
          }
          if (event.done) {
            yield { text: '', done: true };
            return;
          }
        } catch {
          // Skip
        }
      }
    }

    yield { text: '', done: true };
  }

  async validateKey(_key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
