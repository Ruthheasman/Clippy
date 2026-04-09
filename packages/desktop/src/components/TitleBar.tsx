import { useChatStore } from '../stores/chatStore';

export function TitleBar() {
  const provider = useChatStore((s) => s.provider);
  const model = useChatStore((s) => s.model);
  const activeBuddy = useChatStore((s) => s.buddies.find((b) => b.id === s.activeBuddyId));

  const modelShort = model.includes('/') ? model.split('/').pop() : model.split('-').slice(0, 2).join('-');

  return (
    <div className="drag-region flex items-center justify-between px-3 py-2 border-b border-clippy-border shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center text-[10px] font-bold">
          {activeBuddy?.emoji || '📎'}
        </div>
        <span
          className="text-sm font-bold tracking-tight"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          {activeBuddy?.name || 'Clippy'}
        </span>
      </div>

      <div className="no-drag flex items-center gap-1.5">
        <span className="text-[10px] text-clippy-muted px-1.5 py-0.5 bg-white/5 rounded-full truncate max-w-[100px]">
          {modelShort}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-400/80 animate-pulse" title="Connected" />
      </div>
    </div>
  );
}
