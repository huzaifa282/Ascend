import { Badge, Button } from '@ascendant/ui';
import { describeError } from '@ascendant/llm';
import type { ProviderId } from '@ascendant/llm';
import { useModelSettings } from '../../hooks/useModelSettings';
import type { ModelProvider } from '../../settings/schema';

const PROVIDERS: { id: ModelProvider; label: string; needsKey: boolean }[] = [
  { id: 'openai', label: 'OpenAI', needsKey: true },
  { id: 'anthropic', label: 'Anthropic', needsKey: true },
  { id: 'gemini', label: 'Gemini', needsKey: true },
  { id: 'openrouter', label: 'OpenRouter', needsKey: true },
  { id: 'ollama', label: 'Ollama (local)', needsKey: false },
  { id: 'lmstudio', label: 'LM Studio (local)', needsKey: false },
];

/** Settings > Model (spec 10.16): provider chips, masked key -> keychain, model picker, Test connection. */
export function ModelPanel() {
  const { state, setProvider, setApiKeyInput, setModel, saveAndTest } = useModelSettings();
  const providerDef = PROVIDERS.find((p) => p.id === state.provider);

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">Model</h1>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Provider</span>
        <div className="flex items-center gap-2 flex-wrap">
          {PROVIDERS.map((p) => (
            <Button
              key={p.id}
              variant={state.provider === p.id ? 'primary' : 'default'}
              onClick={() => setProvider(p.id as ModelProvider)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {state.provider && (
        <>
          {providerDef?.needsKey && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted" htmlFor="api-key">
                API key {state.hasKey && <span className="text-ok">(stored in the OS keychain)</span>}
              </label>
              <input
                id="api-key"
                type="password"
                value={state.apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={state.hasKey ? '••••••••••••' : 'sk-...'}
                className="h-touch rounded-md border border-rule bg-surface px-3 font-mono text-[13px]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted" htmlFor="model-select">
              Model
            </label>
            {state.models.length > 0 ? (
              <select
                id="model-select"
                value={state.model ?? ''}
                onChange={(e) => setModel(e.target.value)}
                className="h-touch rounded-md border border-rule bg-surface px-2 font-display text-[14px]"
              >
                {state.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="model-select"
                value={state.model ?? ''}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Type a model id, or Test connection to list them"
                className="h-touch rounded-md border border-rule bg-surface px-3 font-display text-[14px]"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={saveAndTest} disabled={state.testing}>
              {state.testing ? 'TESTING…' : 'TEST CONNECTION'}
            </Button>
            {state.testResult &&
              (state.testResult.ok ? (
                <Badge tone="ok">CONNECTED / {state.testResult.latencyMs} MS</Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge tone="danger">{state.testResult.error?.toUpperCase()}</Badge>
                  <span className="font-mono text-[11px] text-text-muted">
                    {state.testResult.error ? describeError(state.testResult.error).fix : ''}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export type { ProviderId };
