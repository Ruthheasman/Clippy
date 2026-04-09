import { useChatStore } from '../stores/chatStore';
import { PROVIDERS } from '../../electron/llm/types';
import type { LLMProvider } from '../../electron/llm/types';

export function ModelsPanel() {
  const provider = useChatStore((s) => s.provider);
  const model = useChatStore((s) => s.model);
  const setProvider = useChatStore((s) => s.setProvider);
  const setModel = useChatStore((s) => s.setModel);

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

  const handleProviderChange = (id: LLMProvider) => {
    setProvider(id);
    const prov = PROVIDERS.find((p) => p.id === id);
    if (prov?.models[0]) setModel(prov.models[0].id);
  };

  const providerEmojis: Record<string, string> = {
    claude: '🟠',
    openai: '🟢',
    gemini: '🔵',
    ollama: '🖥️',
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-clippy-muted mb-1"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
          Provider
        </h2>
        <p className="text-[11px] text-clippy-muted/50 mb-3">Choose your LLM backend</p>

        <div className="space-y-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`
                w-full px-3 py-2.5 rounded-xl text-left transition-all flex items-center gap-3
                ${provider === p.id
                  ? 'bg-clippy-accent/10 border border-clippy-accent/20'
                  : 'bg-white/[0.02] border border-transparent hover:bg-white/5 hover:border-clippy-border'
                }
              `}
            >
              <span className="text-lg">{providerEmojis[p.id]}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-[13px] font-medium ${provider === p.id ? 'text-clippy-accent' : 'text-clippy-text'}`}>
                  {p.name.split('(')[0].trim()}
                </div>
                <div className="text-[10px] text-clippy-muted/50">
                  {p.id === 'ollama' ? 'Local — no key needed' : `${p.models.length} models`}
                </div>
              </div>
              {provider === p.id && (
                <div className="w-2 h-2 rounded-full bg-clippy-accent shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-clippy-muted mb-1"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
          Model
        </h2>
        <p className="text-[11px] text-clippy-muted/50 mb-3">
          {currentProvider.name} models
        </p>

        <div className="space-y-1">
          {currentProvider.models.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`
                w-full px-3 py-2 rounded-lg text-left transition-all flex items-center justify-between
                ${model === m.id
                  ? 'bg-clippy-accent/10 border border-clippy-accent/20'
                  : 'bg-white/[0.02] border border-transparent hover:bg-white/5'
                }
              `}
            >
              <div>
                <div className={`text-[12px] font-medium ${model === m.id ? 'text-clippy-accent' : 'text-clippy-text/80'}`}>
                  {m.name}
                </div>
                <div className="text-[10px] text-clippy-muted/40 font-mono">{m.id}</div>
              </div>
              <div className="flex items-center gap-1.5">
                {m.vision && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-clippy-muted">
                    👁 Vision
                  </span>
                )}
                {model === m.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-clippy-accent" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {provider === 'ollama' && (
        <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-clippy-border">
          <p className="text-[11px] text-clippy-muted/60 leading-relaxed">
            Ollama also works with LM Studio — just change the URL in Settings to point at your LM Studio endpoint (usually <code className="text-clippy-accent/60">http://localhost:1234/v1</code>).
          </p>
        </div>
      )}
    </div>
  );
}
