import { describe, expect, it, vi } from 'vitest';
import { ProviderCallError } from '../errors';
import { createOpenAiCompatibleProvider } from './openaiCompatible';

function fakeFetch(responses: Array<{ status: number; body: unknown; headers?: Record<string, string> }>) {
  let call = 0;
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const r = responses[Math.min(call, responses.length - 1)]!;
    call += 1;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: { get: (name: string) => r.headers?.[name.toLowerCase()] ?? null },
      json: async () => r.body,
    } as unknown as Response;
  });
}

const config = (fetchImpl: typeof fetch) => ({ apiKey: 'sk-test', model: 'gpt-test', fetchImpl });

describe('createOpenAiCompatibleProvider', () => {
  it('lists models from /models', async () => {
    const fetchImpl = fakeFetch([{ status: 200, body: { data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }] } }]);
    const provider = createOpenAiCompatibleProvider('openai', 'https://api.example.com/v1', config(fetchImpl));
    expect(await provider.listModels()).toEqual(['gpt-4o', 'gpt-4o-mini']);
  });

  it('completes via /chat/completions and reports token usage', async () => {
    const fetchImpl = fakeFetch([
      { status: 200, body: { choices: [{ message: { content: '{"items":[]}' } }], usage: { prompt_tokens: 120, completion_tokens: 40 } } },
    ]);
    const provider = createOpenAiCompatibleProvider('openai', 'https://api.example.com/v1', config(fetchImpl));
    const result = await provider.complete({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], maxTokens: 100 });
    expect(result.text).toBe('{"items":[]}');
    expect(result.tokensIn).toBe(120);
    expect(result.tokensOut).toBe(40);
  });

  it('maps a 401 to bad_key', async () => {
    const fetchImpl = fakeFetch([{ status: 401, body: {} }]);
    const provider = createOpenAiCompatibleProvider('openai', 'https://api.example.com/v1', config(fetchImpl));
    await expect(provider.listModels()).rejects.toMatchObject({ kind: 'bad_key' } satisfies Partial<ProviderCallError>);
  });

  it('test() succeeds when listModels succeeds', async () => {
    const fetchImpl = fakeFetch([{ status: 200, body: { data: [] } }]);
    const provider = createOpenAiCompatibleProvider('openai', 'https://api.example.com/v1', config(fetchImpl));
    const result = await provider.test();
    expect(result.ok).toBe(true);
  });

  it('test() reports the mapped error when the call fails', async () => {
    const fetchImpl = fakeFetch([{ status: 429, body: {}, headers: { 'retry-after': '5' } }]);
    const provider = createOpenAiCompatibleProvider('openai', 'https://api.example.com/v1', config(fetchImpl));
    const result = await provider.test();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('rate_limited');
  });

  it('test() checks /key for openrouter instead of the unauthenticated /models list', async () => {
    const fetchImpl = fakeFetch([{ status: 401, body: { error: { message: 'User not found.', code: 401 } } }]);
    const provider = createOpenAiCompatibleProvider('openrouter', 'https://openrouter.ai/api/v1', config(fetchImpl));
    const result = await provider.test();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('bad_key');
    const [calledUrl] = fetchImpl.mock.calls[0]!;
    expect(calledUrl).toContain('/key');
  });

  it('omits the Authorization header when no key is configured (Ollama/LM Studio)', async () => {
    const fetchImpl = fakeFetch([{ status: 200, body: { data: [] } }]);
    const provider = createOpenAiCompatibleProvider('ollama', 'http://127.0.0.1:11434/v1', {
      apiKey: null,
      model: 'llama3',
      fetchImpl,
    });
    await provider.listModels();
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init?.headers).not.toHaveProperty('Authorization');
  });
});
