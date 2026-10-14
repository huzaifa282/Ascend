import { mapHttpError, ProviderCallError } from '../errors';
import type { CompleteRequest, CompleteResult, Provider, ProviderConfig, TestResult } from './types';

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export function createGeminiProvider(config: ProviderConfig): Provider {
  const url = config.baseUrl ?? GEMINI_BASE_URL;
  const key = config.apiKey ?? '';

  async function request(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<Response> {
    const sep = path.includes('?') ? '&' : '?';
    let response: Response;
    try {
      response = await config.fetchImpl(`${url}${path}${sep}key=${encodeURIComponent(key)}`, {
        method: init.method,
        headers: { 'Content-Type': 'application/json' },
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
    } catch {
      throw new ProviderCallError('network', 'Could not reach Gemini.');
    }
    if (!response.ok) {
      const mapped = mapHttpError(response.status, response.headers.get('retry-after'));
      if (mapped) throw mapped;
      throw new ProviderCallError('provider_down', `Unexpected HTTP ${response.status}.`);
    }
    return response;
  }

  return {
    id: 'gemini',
    async listModels(): Promise<string[]> {
      const response = await request('/models', { method: 'GET' });
      const json = (await response.json()) as { models?: Array<{ name: string }> };
      return (json.models ?? []).map((m) => m.name.replace(/^models\//, ''));
    },
    async complete(req: CompleteRequest): Promise<CompleteResult> {
      const response = await request(`/models/${config.model}:generateContent`, {
        method: 'POST',
        body: {
          systemInstruction: { parts: [{ text: req.system }] },
          contents: req.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: {
            maxOutputTokens: req.maxTokens,
            ...(req.json ? { responseMimeType: 'application/json' } : {}),
          },
        },
      });
      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return {
        text,
        tokensIn: json.usageMetadata?.promptTokenCount ?? 0,
        tokensOut: json.usageMetadata?.candidatesTokenCount ?? 0,
      };
    },
    async test(): Promise<TestResult> {
      const start = Date.now();
      try {
        await this.listModels();
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
