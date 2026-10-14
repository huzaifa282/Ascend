/** Spec 6.7 — the provider interface every adapter implements. */
import type { ProviderError } from '../errors';

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'lmstudio';

export interface Msg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompleteRequest {
  system: string;
  messages: Msg[];
  json?: boolean;
  maxTokens: number;
}

export interface CompleteResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export interface TestResult {
  ok: boolean;
  latencyMs: number;
  error?: ProviderError;
}

export interface Provider {
  id: ProviderId;
  listModels(): Promise<string[]>;
  complete(req: CompleteRequest): Promise<CompleteResult>;
  test(): Promise<TestResult>;
}

/**
 * Injected rather than using the global `fetch` directly, so:
 * - the desktop app can pass `tauri-plugin-http`'s fetch (avoids CORS), and
 * - tests can pass a recorded-fixture fetch and run fully offline (spec's
 *   phase 4 acceptance: "recorded fixtures make the tests pass offline").
 */
export type FetchLike = typeof fetch;

export interface ProviderConfig {
  apiKey: string | null;
  model: string | null;
  fetchImpl: FetchLike;
  /** Override for local/self-hosted endpoints (Ollama, LM Studio) or testing. */
  baseUrl?: string;
}
