import { describe, expect, it } from 'vitest';
import { describeError, isRetryable, mapHttpError } from './errors';

describe('mapHttpError', () => {
  it('maps 401/403 to bad_key', () => {
    expect(mapHttpError(401, null)?.kind).toBe('bad_key');
    expect(mapHttpError(403, null)?.kind).toBe('bad_key');
  });

  it('maps 404 to model_missing', () => {
    expect(mapHttpError(404, null)?.kind).toBe('model_missing');
  });

  it('maps 429 to rate_limited and respects retry-after', () => {
    const err = mapHttpError(429, '30');
    expect(err?.kind).toBe('rate_limited');
    expect(err?.retryAfterMs).toBe(30_000);
  });

  it('falls back to the 2-minute backoff when retry-after is absent', () => {
    const err = mapHttpError(429, null);
    expect(err?.retryAfterMs).toBe(2 * 60 * 1000);
  });

  it('maps 5xx to provider_down', () => {
    expect(mapHttpError(500, null)?.kind).toBe('provider_down');
    expect(mapHttpError(503, null)?.kind).toBe('provider_down');
  });

  it('returns null for a successful-looking status', () => {
    expect(mapHttpError(200, null)).toBeNull();
  });
});

describe('isRetryable', () => {
  it('is true only for rate_limited and provider_down', () => {
    expect(isRetryable('rate_limited')).toBe(true);
    expect(isRetryable('provider_down')).toBe(true);
    expect(isRetryable('bad_key')).toBe(false);
    expect(isRetryable('model_missing')).toBe(false);
    expect(isRetryable('network')).toBe(false);
  });
});

describe('describeError', () => {
  it('gives a message and a fix for every error kind', () => {
    for (const kind of ['bad_key', 'rate_limited', 'provider_down', 'model_missing', 'network'] as const) {
      const { message, fix } = describeError(kind);
      expect(message.length).toBeGreaterThan(0);
      expect(fix.length).toBeGreaterThan(0);
    }
  });
});
