import { useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { stripOverlayTags } from '../lib/parsePointing';

export function ChatPanel() {
  const { messages, isStreaming, streamingContent, error, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3 opacity-60">
            <div className="text-4xl">📎</div>
            <p className="text-sm text-clippy-muted leading-relaxed">
              It looks like you're trying to do something.
              <br />
              <span className="text-clippy-text/80">Would you like help with that?</span>
            </p>
            <p className="text-[11px] text-clippy-muted/60 mt-1">
              I can see your screen. Just ask.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming content */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: stripOverlayTags(streamingContent),
              timestamp: Date.now(),
            }}
            isStreaming
          />
        )}

        {/* Typing indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <div className="flex gap-1">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-clippy-accent" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-clippy-accent" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-clippy-accent" />
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <InputBar onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
