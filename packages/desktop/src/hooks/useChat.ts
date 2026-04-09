import { useEffect, useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';

declare global {
  interface Window {
    clippy: {
      captureScreenshot: () => Promise<any>;
      chat: (params: any) => Promise<any>;
      onChatChunk: (cb: (chunk: any) => void) => () => void;
      getConfig: (key: string) => Promise<any>;
      setConfig: (key: string, value: any) => Promise<void>;
      getApiKey: (provider: string) => Promise<string | null>;
      setApiKey: (provider: string, key: string) => Promise<void>;
      validateApiKey: (provider: string, key: string) => Promise<boolean>;
      pointAt: (data: any) => void;
      highlight: (data: any) => void;
      clearOverlay: () => void;
    };
  }
}

export function useChat() {
  const {
    messages,
    isStreaming,
    streamingContent,
    provider,
    model,
    autoScreenshot,
    error,
    buddies,
    activeBuddyId,
    addMessage,
    setStreaming,
    appendStreamContent,
    finaliseAssistantMessage,
    setError,
  } = useChatStore();

  const cleanupRef = useRef<(() => void) | null>(null);

  // Listen for streaming chunks
  useEffect(() => {
    if (!window.clippy) return;

    cleanupRef.current = window.clippy.onChatChunk((chunk) => {
      if (chunk.done) {
        finaliseAssistantMessage();
      } else {
        appendStreamContent(chunk.text);
      }
    });

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);

      let screenshot: string | undefined;

      // Capture screenshot if enabled
      if (autoScreenshot && window.clippy) {
        try {
          const result = await window.clippy.captureScreenshot();
          if (result) {
            screenshot = result.image;
          }
        } catch (err) {
          console.warn('Screenshot capture failed:', err);
        }
      }

      // Add user message
      addMessage({ role: 'user', content, screenshot });
      setStreaming(true);

      // Build message history for the API
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ];

      // Get the active buddy's custom system prompt (if any)
      const activeBuddy = buddies.find((b) => b.id === activeBuddyId);
      const buddyPrompt = activeBuddy?.systemPrompt || undefined;

      try {
        const result = await window.clippy.chat({
          provider,
          model,
          messages: history,
          screenshot,
          buddyPrompt,
        });

        if (result?.error) {
          setError(result.error);
          setStreaming(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to send message');
        setStreaming(false);
      }
    },
    [messages, isStreaming, provider, model, autoScreenshot, buddies, activeBuddyId]
  );

  return {
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
  };
}
