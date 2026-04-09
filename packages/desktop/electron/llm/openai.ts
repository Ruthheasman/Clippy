import type { LLMAdapter, ChatParams, StreamChunk } from './types';

export class OpenAIAdapter implements LLMAdapter {
  id = 'openai' as const;
  name = 'OpenAI';
  models = [
    { id: 'gpt-4o', name: 'GPT-4o', vision: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', vision: true },
    { id: 'gpt-4.1', name: 'GPT-4.1', vision: true },
  ];
  requiresKey = true;

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const { model, messages, systemPrompt, screenshot, apiKey } = params;

    const apiMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLast = i === messages.length - 1;

      if (msg.role === 'user' && isLast && screenshot) {
        apiMessages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: screenshot, detail: 'high' },
            },
            { type: 'text', text: msg.content },
          ],
        });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
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
          // Skip malformed JSON
        }
      }
    }

    yield { text: '', done: true };
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
