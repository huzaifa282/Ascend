/** Calls the keychain_* commands in apps/desktop/src-tauri/src/commands/keychain.rs (spec 12.1). */
import { invoke } from '@tauri-apps/api/core';
import type { Keychain } from './types';

export function createTauriKeychain(): Keychain {
  return {
    set: (provider, key) => invoke('keychain_set', { provider, key }),
    get: (provider) => invoke('keychain_get', { provider }),
    has: (provider) => invoke('keychain_has', { provider }),
    delete: (provider) => invoke('keychain_delete', { provider }),
  };
}
