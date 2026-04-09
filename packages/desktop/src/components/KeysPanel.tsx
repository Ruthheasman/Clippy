import { useState, useEffect } from 'react';
import { PROVIDERS } from '../../electron/llm/types';
import type { LLMProvider } from '../../electron/llm/types';

interface KeyState {
  value: string;
  saved: boolean;
  validating: boolean;
  valid: boolean | null;
}

export function KeysPanel() {
  const [keys, setKeys] = useState<Record<string, KeyState>>({});

  useEffect(() => {
    if (!window.clippy) return;
    PROVIDERS.forEach(async (p) => {
      if (!p.requiresKey) return;
      const key = await window.clippy.getApiKey(p.id);
      setKeys((prev) => ({
        ...prev,
        [p.id]: {
          value: key || '',
          saved: !!key,
          validating: false,
          valid: key ? true : null,
        },
      }));
    });
  }, []);

  const handleChange = (providerId: LLMProvider, value: string) => {
    setKeys((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], value, saved: false, valid: null },
    }));
  };

  const handleSave = async (providerId: LLMProvider) => {
    const key = keys[providerId]?.value;
    if (!key?.trim() || !window.clippy) return;

    setKeys((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], validating: true },
    }));

    try {
      const valid = await window.clippy.validateApiKey(providerId, key.trim());
      if (valid) {
        await window.clippy.setApiKey(providerId, key.trim());
      }
      setKeys((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], validating: false, saved: valid, valid },
      }));
    } catch {
      setKeys((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], validating: false, valid: false },
      }));
    }
  };

  const statusIcon = (state?: KeyState) => {
    if (!state || state.valid === null) return null;
    if (state.validating) return <span className="text-clippy-muted animate-pulse">⋯</span>;
    if (state.valid) return <span className="text-green-400">✓</span>;
    return <span className="text-red-400">✗</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-clippy-muted mb-1"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
          API Keys
        </h2>
        <p className="text-[11px] text-clippy-muted/50 mb-4">
          Keys are encrypted and stored in your OS keychain. Never sent anywhere except the provider's API.
        </p>
      </div>

      {PROVIDERS.filter((p) => p.requiresKey).map((p) => {
        const state = keys[p.id];
        return (
          <div key={p.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-clippy-text/80">
                {p.name}
              </label>
              {statusIcon(state)}
            </div>

            <div className="flex gap-1.5">
              <input
                type="password"
                value={state?.value || ''}
                onChange={(e) => handleChange(p.id, e.target.value)}
                placeholder={p.keyPlaceholder}
                className="flex-1 bg-white/[0.03] border border-clippy-border rounded-lg px-3 py-2
                           text-[11px] text-clippy-text placeholder:text-clippy-muted/30
                           focus:outline-none focus:border-clippy-accent/30 transition-colors
                           font-mono"
              />
              <button
                onClick={() => handleSave(p.id)}
                disabled={!state?.value?.trim() || state?.validating}
                className="px-3 py-2 rounded-lg text-[11px] font-medium
                           bg-clippy-accent/10 text-clippy-accent border border-clippy-accent/20
                           hover:bg-clippy-accent/20 disabled:opacity-30
                           transition-all shrink-0"
              >
                {state?.validating ? '...' : state?.saved ? 'Saved' : 'Save'}
              </button>
            </div>

            <p className="text-[10px] text-clippy-muted/40">{p.keyHint}</p>
          </div>
        );
      })}

      <div className="pt-3 border-t border-clippy-border">
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02]">
          <span className="text-sm mt-0.5">🖥️</span>
          <div>
            <p className="text-[12px] text-clippy-text/80 font-medium">Ollama / LM Studio</p>
            <p className="text-[10px] text-clippy-muted/50 mt-0.5 leading-relaxed">
              Local models don't need an API key. Just make sure Ollama or LM Studio is running and select it in Models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
