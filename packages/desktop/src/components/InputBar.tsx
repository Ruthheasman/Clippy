import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function InputBar({ onSend, disabled }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoScreenshot = useChatStore((s) => s.autoScreenshot);
  const setAutoScreenshot = useChatStore((s) => s.setAutoScreenshot);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-clippy-border px-3 py-2.5">
      <div className="flex items-end gap-2">
        {/* Screenshot toggle */}
        <button
          onClick={() => setAutoScreenshot(!autoScreenshot)}
          className={`
            shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all
            ${autoScreenshot
              ? 'bg-clippy-accent/15 text-clippy-accent'
              : 'text-clippy-muted hover:text-clippy-text hover:bg-white/5'
            }
          `}
          title={autoScreenshot ? 'Screenshot: ON' : 'Screenshot: OFF'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-[13px] text-clippy-text placeholder:text-clippy-muted/50
                     resize-none outline-none py-1.5 min-h-[20px] max-h-[100px]
                     disabled:opacity-40"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg
                     bg-clippy-accent/15 text-clippy-accent transition-all
                     hover:bg-clippy-accent/25 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Status indicator */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-clippy-muted/40">
          {autoScreenshot ? '📷 Screen visible' : '📷 Screen hidden'}
        </span>
        <span className="text-[10px] text-clippy-muted/40">
          Shift+Enter for new line
        </span>
      </div>
    </div>
  );
}
