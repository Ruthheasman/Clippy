import { useState } from 'react';
import { useChatStore, type Buddy } from '../stores/chatStore';

export function BuddiesPanel() {
  const buddies = useChatStore((s) => s.buddies);
  const activeBuddyId = useChatStore((s) => s.activeBuddyId);
  const setActiveBuddy = useChatStore((s) => s.setActiveBuddy);
  const addBuddy = useChatStore((s) => s.addBuddy);
  const removeBuddy = useChatStore((s) => s.removeBuddy);

  const [creating, setCreating] = useState(false);
  const [newBuddy, setNewBuddy] = useState({
    name: '',
    emoji: '🤖',
    description: '',
    systemPrompt: '',
  });

  const handleCreate = () => {
    if (!newBuddy.name.trim() || !newBuddy.systemPrompt.trim()) return;
    addBuddy({ ...newBuddy, active: false });
    setNewBuddy({ name: '', emoji: '🤖', description: '', systemPrompt: '' });
    setCreating(false);
  };

  const EMOJI_OPTIONS = ['🤖', '🧙', '🦊', '🐙', '👻', '🎯', '⚡', '🔥', '💎', '🌊', '🦉', '🐝'];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-clippy-muted mb-1"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
          Buddies
        </h2>
        <p className="text-[11px] text-clippy-muted/50 mb-3">
          Different personalities with different skills. Switch on the fly.
        </p>
      </div>

      {/* Buddy list */}
      <div className="space-y-1.5">
        {buddies.map((buddy) => (
          <button
            key={buddy.id}
            onClick={() => setActiveBuddy(buddy.id)}
            className={`
              w-full px-3 py-2.5 rounded-xl text-left transition-all flex items-center gap-3 group
              ${activeBuddyId === buddy.id
                ? 'bg-clippy-accent/10 border border-clippy-accent/20'
                : 'bg-white/[0.02] border border-transparent hover:bg-white/5 hover:border-clippy-border'
              }
            `}
          >
            <span className="text-xl">{buddy.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-medium ${activeBuddyId === buddy.id ? 'text-clippy-accent' : 'text-clippy-text'}`}>
                {buddy.name}
              </div>
              <div className="text-[10px] text-clippy-muted/50 truncate">
                {buddy.description}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeBuddyId === buddy.id && (
                <div className="w-2 h-2 rounded-full bg-clippy-accent animate-pulse" />
              )}
              {/* Remove button for custom buddies */}
              {!['clippy', 'code-reviewer', 'design-critic', 'tutor'].includes(buddy.id) && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBuddy(buddy.id);
                  }}
                  className="text-clippy-muted/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-sm"
                >
                  ×
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Create new buddy */}
      {creating ? (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-clippy-border">
          <div className="text-[12px] font-medium text-clippy-text/80"
               style={{ fontFamily: 'Outfit, sans-serif' }}>
            New Buddy
          </div>

          {/* Emoji picker */}
          <div className="flex flex-wrap gap-1">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setNewBuddy((prev) => ({ ...prev, emoji: e }))}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all
                  ${newBuddy.emoji === e ? 'bg-clippy-accent/15 ring-1 ring-clippy-accent/30' : 'hover:bg-white/5'}`}
              >
                {e}
              </button>
            ))}
          </div>

          <input
            value={newBuddy.name}
            onChange={(e) => setNewBuddy((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name (e.g. Debugger Dave)"
            className="w-full bg-white/[0.03] border border-clippy-border rounded-lg px-3 py-2
                       text-[12px] text-clippy-text placeholder:text-clippy-muted/30
                       focus:outline-none focus:border-clippy-accent/30 transition-colors"
          />

          <input
            value={newBuddy.description}
            onChange={(e) => setNewBuddy((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Short description"
            className="w-full bg-white/[0.03] border border-clippy-border rounded-lg px-3 py-2
                       text-[12px] text-clippy-text placeholder:text-clippy-muted/30
                       focus:outline-none focus:border-clippy-accent/30 transition-colors"
          />

          <textarea
            value={newBuddy.systemPrompt}
            onChange={(e) => setNewBuddy((prev) => ({ ...prev, systemPrompt: e.target.value }))}
            placeholder="System prompt — tell this buddy who they are, how they should behave, and what they're good at..."
            rows={4}
            className="w-full bg-white/[0.03] border border-clippy-border rounded-lg px-3 py-2
                       text-[11px] text-clippy-text placeholder:text-clippy-muted/30
                       focus:outline-none focus:border-clippy-accent/30 transition-colors
                       resize-none font-mono leading-relaxed"
          />

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newBuddy.name.trim() || !newBuddy.systemPrompt.trim()}
              className="flex-1 px-3 py-2 rounded-lg text-[11px] font-medium
                         bg-clippy-accent/15 text-clippy-accent border border-clippy-accent/20
                         hover:bg-clippy-accent/25 disabled:opacity-30 transition-all"
            >
              Create Buddy
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-2 rounded-lg text-[11px] text-clippy-muted hover:text-clippy-text
                         hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full px-3 py-2.5 rounded-xl text-[12px] text-clippy-muted/60
                     border border-dashed border-clippy-border hover:border-clippy-accent/30
                     hover:text-clippy-accent/60 transition-all flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>Create Custom Buddy</span>
        </button>
      )}
    </div>
  );
}
