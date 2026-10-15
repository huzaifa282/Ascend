import { useCallback, useEffect, useState } from 'react';
import { createProvider, type ProviderId, type TestResult } from '@ascendant/llm';
import { getPlatform } from '../platform';
import type { ModelProvider, ModelTestResultRecord } from '../settings/schema';
import { resolveRepos } from './useRepos';

export interface ModelSettingsState {
  provider: ModelProvider | null;
  model: string | null;
  hasKey: boolean;
  apiKeyInput: string;
  models: string[];
  testing: boolean;
  testResult: TestResult | null;
  saveError: string | null;
}

const PROVIDERS_NEEDING_NO_KEY: ModelProvider[] = ['ollama', 'lmstudio'];

function fromRecord(record: ModelTestResultRecord | null): TestResult | null {
  if (!record) return null;
  return { ok: record.ok, latencyMs: record.latencyMs, error: (record.error ?? undefined) as TestResult['error'] };
}

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
    saveError: null,
  });

  useEffect(() => {
    (async () => {
      const repos = await resolveRepos();
      const settingsRow = await repos.settings.get();
      const model = settingsRow?.model as
        | { provider: ModelProvider | null; model: string | null; lastTestResult?: ModelTestResultRecord | null }
        | undefined;
      if (!model?.provider) return;
      let hasKey = false;
      try {
        const platform = await getPlatform();
        hasKey = await platform.keychain.has(model.provider);
      } catch {
        // Keychain unreadable — still show the saved provider/model; the key field
        // will just prompt for re-entry rather than silently losing the selection.
      }
      setState((s) => ({
        ...s,
        provider: model.provider,
        model: model.model,
        hasKey,
        testResult: fromRecord(model.lastTestResult ?? null),
      }));
    })();
  }, []);

  const setProvider = useCallback((provider: ModelProvider) => {
    setState((s) => ({ ...s, provider, model: null, models: [], testResult: null, saveError: null }));
  }, []);

  const setApiKeyInput = useCallback((apiKeyInput: string) => setState((s) => ({ ...s, apiKeyInput })), []);
  const setModel = useCallback((model: string) => setState((s) => ({ ...s, model })), []);

  const saveAndTest = useCallback(async () => {
    setState((s) => ({ ...s, testing: true, testResult: null, saveError: null }));
    const current = state;
    if (!current.provider) {
      setState((s) => ({ ...s, testing: false }));
      return;
    }

    try {
      const platform = await getPlatform();

      let apiKey: string | null = null;
      let keychainError = false;
      try {
        if (current.apiKeyInput) {
          await platform.keychain.set(current.provider, current.apiKeyInput);
        }
        apiKey = await platform.keychain.get(current.provider);
      } catch {
        keychainError = true;
      }

      // Provider + model are the user's choice regardless of whether the keychain
      // step above worked — persist them unconditionally so a keychain hiccup never
      // silently discards the selection (spec: settings persist across restarts).
      const repos = await resolveRepos();
      const settingsRow = await repos.settings.get();
      const hasKey = Boolean(apiKey);

      let testResult: TestResult | null = null;
      const needsKey = !PROVIDERS_NEEDING_NO_KEY.includes(current.provider);
      let models: string[] = [];

      if (keychainError) {
        testResult = { ok: false, latencyMs: 0, error: 'network' };
      } else if (needsKey && !apiKey) {
        testResult = { ok: false, latencyMs: 0, error: 'bad_key' };
      } else {
        const provider = createProvider(current.provider, {
          apiKey,
          model: current.model,
          fetchImpl: platform.fetch,
        });
        try {
          models = await provider.listModels();
        } catch {
          // test() below reports the specific error; listing models is best-effort here.
        }
        testResult = await provider.test();
      }

      if (settingsRow) {
        await repos.settings.update(settingsRow.id, {
          model: {
            provider: current.provider,
            model: current.model,
            hasKey,
            lastTestResult: testResult
              ? { ok: testResult.ok, latencyMs: testResult.latencyMs, error: testResult.error ?? null, testedAt: Date.now() }
              : null,
          },
          updatedAt: Date.now(),
        });
      }

      setState((s) => ({
        ...s,
        apiKeyInput: '',
        hasKey,
        models,
        testing: false,
        testResult,
      }));
    } catch (err) {
      setState((s) => ({ ...s, testing: false, saveError: err instanceof Error ? err.message : 'Could not save settings.' }));
    }
  }, [state]);

  return { state, setProvider, setApiKeyInput, setModel, saveAndTest };
}

export type { ProviderId };
