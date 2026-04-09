import type { LLMAdapter, ChatParams, StreamChunk } from './types';

export class GeminiAdapter implements LLMAdapter {
  id = 'gemini' as const;
  name = 'Google (Gemini)';
  models = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', vision: true },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', vision: true },
  ];
  requiresKey = true;

  async *chat(params: ChatParams): AsyncGenerator<StreamChunk> {
    const { model, messages, systemPrompt, screenshot, apiKey } = params;

    const contents: any[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLast = i === messages.length - 1;
      const parts: any[] = [];

      if (msg.role === 'user' && isLast && screenshot) {
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        parts.push({
          inline_data: {
            mime_type: 'image/png',
            data: base64Data,
          },
        });
      }

      parts.push({ text: msg.content });

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${err}`);
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

        try {
          const event = JSON.parse(data);
          const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield { text, done: false };
          }
        } catch {
          // Skip
        }
      }
    }

    yield { text: '', done: true };
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
