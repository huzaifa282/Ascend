/**
 * Shared implementation for every OpenAI-compatible chat/completions API:
 * OpenAI itself, OpenRouter, and the local Ollama/LM Studio endpoints
 * (spec 6.7: "Ollama and LM Studio use their OpenAI-compatible local
 * endpoints... and need no key").
 */
import { mapHttpError, ProviderCallError } from '../errors';
import type { CompleteRequest, CompleteResult, Provider, ProviderConfig, ProviderId, TestResult } from './types';

export function createOpenAiCompatibleProvider(id: ProviderId, baseUrl: string, config: ProviderConfig): Provider {
  const url = config.baseUrl ?? baseUrl;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  async function request(path: string, body?: unknown): Promise<Response> {
    let response: Response;
    try {
      response = await config.fetchImpl(`${url}${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ProviderCallError('network', 'Could not reach the provider.');
    }
    if (!response.ok) {
      const mapped = mapHttpError(response.status, response.headers.get('retry-after'));
      if (mapped) throw mapped;
      throw new ProviderCallError('provider_down', `Unexpected HTTP ${response.status}.`);
    }
    return response;
  }

  return {
    id,
    async listModels(): Promise<string[]> {
      const response = await request('/models');
      const json = (await response.json()) as { data?: Array<{ id: string }> };
      return (json.data ?? []).map((m) => m.id);
    },
    async complete(req: CompleteRequest): Promise<CompleteResult> {
      const response = await request('/chat/completions', {
        model: config.model,
        messages: [{ role: 'system', content: req.system }, ...req.messages],
        max_tokens: req.maxTokens,
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
      });
      const json = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      return {
        text: json.choices[0]?.message.content ?? '',
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0,
      };
    },
    async test(): Promise<TestResult> {
      const start = Date.now();
      try {
        // OpenRouter's /models list is public and needs no key at all, so it
        // can't prove a key works — /key is the one GET endpoint that actually
        // checks auth, so use that instead to avoid a false "connected".
        if (id === 'openrouter') {
          await request('/key');
        } else {
          await this.listModels();
        }
        return { ok: true, latencyMs: Date.now() - start };
      } catch (err) {
        if (err instanceof ProviderCallError) {
          return { ok: false, latencyMs: Date.now() - start, error: err.kind };
        }
        return { ok: false, latencyMs: Date.now() - start, error: 'network' };
      }
    },
  };
}

export const OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1';
export const LMSTUDIO_BASE_URL = 'http://127.0.0.1:1234/v1';
