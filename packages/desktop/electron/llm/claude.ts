import type { LLMAdapter, ChatParams, StreamChunk } from './types';

export class ClaudeAdapter implements LLMAdapter {
  id = 'claude' as const;
  name = 'Anthropic (Claude)';
  models = [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', vision: true },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', vision: true },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', vision: true },
  ];
  requiresKey = true;

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const { model, messages, systemPrompt, screenshot, apiKey } = params;

    // Build messages array with vision support
    const apiMessages = messages.map((msg, i) => {
      const isLast = i === messages.length - 1;
      const content: any[] = [];

      // Attach screenshot to the last user message
      if (msg.role === 'user' && isLast && screenshot) {
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64Data,
          },
        });
      }

      content.push({ type: 'text', text: msg.content });

      return { role: msg.role, content };
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error (${response.status}): ${err}`);
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
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { text: '', done: true };
          return;
        }

        try {
          const event = JSON.parse(data);

          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            yield { text: event.delta.text, done: false };
          }

          if (event.type === 'message_stop') {
            yield { text: '', done: true };
            return;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    yield { text: '', done: true };
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
