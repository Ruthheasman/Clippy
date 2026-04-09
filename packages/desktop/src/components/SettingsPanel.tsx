import { useChatStore } from '../stores/chatStore';

export function SettingsPanel() {
  const autoScreenshot = useChatStore((s) => s.autoScreenshot);
  const setAutoScreenshot = useChatStore((s) => s.setAutoScreenshot);
  const clearMessages = useChatStore((s) => s.clearMessages);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-clippy-muted mb-1"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
          Settings
        </h2>
      </div>

      {/* Screenshots */}
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-clippy-muted font-medium">
          Screenshots
        </h3>
        <label className="flex items-center justify-between py-2 cursor-pointer">
          <div>
            <div className="text-[12px] text-clippy-text/80">Auto-capture</div>
            <div className="text-[10px] text-clippy-muted/50">Attach screenshot with every message</div>
          </div>
          <div
            onClick={() => setAutoScreenshot(!autoScreenshot)}
            className={`w-9 h-5 rounded-full transition-all cursor-pointer flex items-center px-0.5
              ${autoScreenshot ? 'bg-clippy-accent/40' : 'bg-white/10'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm
              ${autoScreenshot ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </label>
      </section>

      {/* Ollama / LM Studio URL */}
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-clippy-muted font-medium">
          Local Models
        </h3>
        <div>
          <label className="text-[11px] text-clippy-muted/60 mb-1 block">Ollama / LM Studio URL</label>
          <input
            type="text"
            defaultValue="http://localhost:11434"
            className="w-full bg-white/[0.03] border border-clippy-border rounded-lg px-3 py-2
                       text-[11px] text-clippy-text font-mono
                       focus:outline-none focus:border-clippy-accent/30 transition-colors"
          />
        </div>
      </section>

      {/* Keyboard shortcuts */}
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-clippy-muted font-medium">
          Shortcuts
        </h3>
        <div className="space-y-1.5">
          {[
            ['Toggle window', '⌘⇧C'],
            ['Send message', 'Enter'],
            ['New line', '⇧Enter'],
            ['Quick screenshot', '⌘⇧S'],
          ].map(([label, shortcut]) => (
            <div key={label} className="flex items-center justify-between py-1">
              <span className="text-[11px] text-clippy-muted/60">{label}</span>
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-clippy-muted font-mono">
                {shortcut}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      {/* Web Injection */}
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-clippy-muted font-medium">
          Browser Widget
        </h3>
        <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-clippy-border">
          <p className="text-[11px] text-clippy-muted/60 leading-relaxed mb-2">
            Use Clippy in any browser without installing the desktop app. Add this script to any page:
          </p>
          <div className="bg-black/30 rounded-md px-2.5 py-1.5 font-mono text-[10px] text-clippy-accent/70 break-all select-all">
            {'<script src="https://clippy.ruthdesigns.digital/inject.js"></script>'}
          </div>
          <p className="text-[10px] text-clippy-muted/40 mt-1.5">
            Or use the bookmarklet (drag to bookmark bar)
          </p>
        </div>
      </section>

      {/* About */}
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-clippy-muted font-medium">
          About
        </h3>
        <div className="text-[11px] text-clippy-muted/50 space-y-1">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-clippy-text/60">0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span>Built by</span>
            <span className="text-clippy-text/60">Ruth Designs Digital</span>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="pt-3 border-t border-clippy-border space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-red-400/50 font-medium">
          Danger Zone
        </h3>
        <button
          onClick={clearMessages}
          className="text-[11px] px-3 py-1.5 rounded-lg text-red-400/60 hover:text-red-400
                     border border-red-400/10 hover:border-red-400/20 hover:bg-red-400/5 transition-all"
        >
          Clear all conversations
        </button>
      </section>
    </div>
  );
}
