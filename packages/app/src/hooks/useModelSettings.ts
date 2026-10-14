import { useCallback, useEffect, useState } from 'react';
import { createProvider, type ProviderId, type TestResult } from '@ascendant/llm';
import { getPlatform } from '../platform';
import type { ModelProvider } from '../settings/schema';
import { resolveRepos } from './useRepos';

export interface ModelSettingsState {
  provider: ModelProvider | null;
  model: string | null;
  hasKey: boolean;
  apiKeyInput: string;
  models: string[];
  testing: boolean;
  testResult: TestResult | null;
}

const PROVIDERS_NEEDING_NO_KEY: ModelProvider[] = ['ollama', 'lmstudio'];

/** Settings > Model (spec 10.16): provider, masked key -> keychain, model picker, Test connection. */
export function useModelSettings() {
  const [state, setState] = useState<ModelSettingsState>({
    provider: null,
    model: null,
    hasKey: false,
    apiKeyInput: '',
    models: [],
    testing: false,
    testResult: null,
  });

  useEffect(() => {
    (async () => {
      const repos = await resolveRepos();
      const settingsRow = await repos.settings.get();
      const model = settingsRow?.model as { provider: ModelProvider | null; model: string | null } | undefined;
      if (!model?.provider) return;
      const platform = await getPlatform();
      const hasKey = await platform.keychain.has(model.provider);
      setState((s) => ({ ...s, provider: model.provider, model: model.model, hasKey }));
    })();
  }, []);

  const setProvider = useCallback((provider: ModelProvider) => {
    setState((s) => ({ ...s, provider, model: null, models: [], testResult: null }));
  }, []);

  const setApiKeyInput = useCallback((apiKeyInput: string) => setState((s) => ({ ...s, apiKeyInput })), []);
  const setModel = useCallback((model: string) => setState((s) => ({ ...s, model })), []);

  const saveAndTest = useCallback(async () => {
    setState((s) => ({ ...s, testing: true, testResult: null }));
    const current = state;
    if (!current.provider) {
      setState((s) => ({ ...s, testing: false }));
      return;
    }

    const platform = await getPlatform();
    if (current.apiKeyInput) {
      await platform.keychain.set(current.provider, current.apiKeyInput);
    }
    const apiKey = await platform.keychain.get(current.provider);
    const needsKey = !PROVIDERS_NEEDING_NO_KEY.includes(current.provider);
    if (needsKey && !apiKey) {
      setState((s) => ({ ...s, testing: false, testResult: { ok: false, latencyMs: 0, error: 'bad_key' } }));
      return;
    }

    const provider = createProvider(current.provider, {
      apiKey,
      model: current.model,
      fetchImpl: platform.fetch,
    });

    let models: string[] = [];
    try {
      models = await provider.listModels();
    } catch {
      // test() below reports the specific error; listing models is best-effort here.
    }
    const testResult = await provider.test();

    const repos = await resolveRepos();
    const settingsRow = await repos.settings.get();
    if (settingsRow) {
      await repos.settings.update(settingsRow.id, {
        model: { provider: current.provider, model: current.model, hasKey: Boolean(apiKey) },
        updatedAt: Date.now(),
      });
    }

    setState((s) => ({
      ...s,
      apiKeyInput: '',
      hasKey: Boolean(apiKey),
      models,
      testing: false,
      testResult,
    }));
  }, [state]);

  return { state, setProvider, setApiKeyInput, setModel, saveAndTest };
}

export type { ProviderId };
