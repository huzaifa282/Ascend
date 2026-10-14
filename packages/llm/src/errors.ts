/** Spec 6.7 — provider error mapping and retry policy. */
export type ProviderError = 'bad_key' | 'rate_limited' | 'provider_down' | 'model_missing' | 'network';

export class ProviderCallError extends Error {
  constructor(
    public readonly kind: ProviderError,
    message: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'ProviderCallError';
  }
}

/** Maps an HTTP response status (and optional retry-after header) to a ProviderError. */
export function mapHttpError(status: number, retryAfterHeader: string | null): ProviderCallError | null {
  if (status === 401 || status === 403) {
    return new ProviderCallError('bad_key', `Authentication failed (HTTP ${status}).`);
  }
  if (status === 404) {
    return new ProviderCallError('model_missing', 'The selected model was not found.');
  }
  if (status === 429) {
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : RETRY_BACKOFF_MS;
    return new ProviderCallError('rate_limited', 'Rate limited.', Number.isFinite(retryAfterMs) ? retryAfterMs : RETRY_BACKOFF_MS);
  }
  if (status >= 500) {
    return new ProviderCallError('provider_down', `Provider error (HTTP ${status}).`);
  }
  return null;
}

/** 2-minute backoff for rate_limited / provider_down (spec 6.7): "never drop an entry." */
export const RETRY_BACKOFF_MS = 2 * 60 * 1000;

export function isRetryable(kind: ProviderError): boolean {
  return kind === 'rate_limited' || kind === 'provider_down';
}

/** One human sentence + a fix action label, shown in the command bar / confirm card. */
export function describeError(kind: ProviderError): { message: string; fix: string } {
  switch (kind) {
    case 'bad_key':
      return { message: 'That API key was rejected.', fix: 'Check the key in Settings > Model.' };
    case 'rate_limited':
      return { message: "You've hit the provider's rate limit.", fix: 'Retrying automatically.' };
    case 'provider_down':
      return { message: 'The provider is temporarily unavailable.', fix: 'Retrying automatically.' };
    case 'model_missing':
      return { message: 'That model is not available.', fix: 'Pick another model in Settings > Model.' };
    case 'network':
      return { message: 'No connection to the provider.', fix: 'Check your internet connection.' };
  }
}
