import type { LLMAdapter, ChatParams, StreamChunk } from './types';

/**
 * LM Studio exposes an OpenAI-compatible API at localhost:1234/v1
 * This adapter reuses the OpenAI streaming format but hits the local endpoint.
 * No API key needed — LM Studio handles auth locally.
 */
export class LMStudioAdapter implements LLMAdapter {
  id = 'lmstudio' as const;
  name = 'LM Studio (Local)';
  models = [
    { id: 'loaded-model', name: 'Currently Loaded Model', vision: true },
  ];
  requiresKey = false;

  private baseUrl = 'http://localhost:1234/v1';

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const { model, messages, systemPrompt, screenshot } = params;

    const apiMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLast = i === messages.length - 1;

      if (msg.role === 'user' && isLast && screenshot) {
        // LM Studio supports OpenAI vision format for compatible models
        apiMessages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: screenshot },
            },
            { type: 'text', text: msg.content },
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // LM Studio auto-selects the loaded model if we send an empty or wildcard model name
    const modelId = model === 'loaded-model' ? '' : model;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: apiMessages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LM Studio error (${response.status}): ${err}`);
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
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          yield { text: '', done: true };
          return;
        }

        try {
          const event = JSON.parse(data);
          const delta = event.choices?.[0]?.delta?.content;
          if (delta) {
            yield { text: delta, done: false };
          }
          if (event.choices?.[0]?.finish_reason === 'stop') {
            yield { text: '', done: true };
            return;
          }
        } catch {
          // Skip malformed
        }
      }
    }

    yield { text: '', done: true };
  }

  async validateKey(_key: string): Promise<boolean> {
    // No key needed — just check if LM Studio is running
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
