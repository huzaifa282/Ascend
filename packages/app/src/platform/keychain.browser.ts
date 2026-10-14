/**
 * A fake keychain for the browser/web-demo adapter (spec section 13):
 * localStorage, not a real OS keychain. Never used by the desktop build.
 */
import type { Keychain } from './types';

const PREFIX = 'ascendant:keychain:';

export function createBrowserKeychain(): Keychain {
  return {
    async set(provider, key) {
      localStorage.setItem(PREFIX + provider, key);
    },
    async get(provider) {
      return localStorage.getItem(PREFIX + provider);
    },
    async has(provider) {
      return localStorage.getItem(PREFIX + provider) != null;
    },
    async delete(provider) {
      localStorage.removeItem(PREFIX + provider);
    },
  };
}
