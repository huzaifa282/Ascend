import { mapHttpError, ProviderCallError } from '../errors';
import type { CompleteRequest, CompleteResult, Provider, ProviderConfig, TestResult } from './types';

export const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

export function createAnthropicProvider(config: ProviderConfig): Provider {
  const url = config.baseUrl ?? ANTHROPIC_BASE_URL;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  };
  if (config.apiKey) headers['x-api-key'] = config.apiKey;

  async function request(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<Response> {
    let response: Response;
    try {
      response = await config.fetchImpl(`${url}${path}`, {
        method: init.method,
        headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
    } catch {
      throw new ProviderCallError('network', 'Could not reach Anthropic.');
    }
    if (!response.ok) {
      const mapped = mapHttpError(response.status, response.headers.get('retry-after'));
      if (mapped) throw mapped;
      throw new ProviderCallError('provider_down', `Unexpected HTTP ${response.status}.`);
    }
    return response;
  }

  return {
    id: 'anthropic',
    async listModels(): Promise<string[]> {
      const response = await request('/models', { method: 'GET' });
      const json = (await response.json()) as { data?: Array<{ id: string }> };
      return (json.data ?? []).map((m) => m.id);
    },
    async complete(req: CompleteRequest): Promise<CompleteResult> {
      const response = await request('/messages', {
        method: 'POST',
        body: {
          model: config.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages: req.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
        },
      });
      const json = (await response.json()) as {
        content: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = json.content.find((c) => c.type === 'text')?.text ?? '';
      return {
        text,
        tokensIn: json.usage?.input_tokens ?? 0,
        tokensOut: json.usage?.output_tokens ?? 0,
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
