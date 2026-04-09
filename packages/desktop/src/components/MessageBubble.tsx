import type { ChatMessage } from '../stores/chatStore';

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`animate-slide-up ${isUser ? 'flex justify-end' : ''}`}
    >
      <div
        className={`
          max-w-[90%] rounded-xl px-3 py-2 text-[13px] leading-relaxed
          ${isUser
            ? 'bg-clippy-accent/15 text-clippy-text border border-clippy-accent/10'
            : 'text-clippy-text/90'
          }
          ${isStreaming ? 'border-l-2 border-l-clippy-accent/40' : ''}
        `}
      >
        <div className="message-content">
          <SimpleMarkdown text={message.content} />
        </div>

        {message.screenshot && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-clippy-muted">
            <span>📷</span>
            <span>Screenshot attached</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Dead-simple markdown renderer.
 * No external deps. Handles code blocks, inline code, bold, italic.
 */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';
  let blockKey = 0;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={blockKey++}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim() === '') {
      elements.push(<br key={blockKey++} />);
      continue;
    }

    // Inline formatting
    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

    elements.push(
      <p key={blockKey++} dangerouslySetInnerHTML={{ __html: formatted }} />
    );
  }

  // Unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key={blockKey++}>
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return <>{elements}</>;
}
