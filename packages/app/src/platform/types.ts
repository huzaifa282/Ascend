import type { SqlExecutor } from '@ascendant/db';

/** Spec 12.1 — API keys only in the OS keychain, never in SQLite/files/logs. */
export interface Keychain {
  set(provider: string, key: string): Promise<void>;
  get(provider: string): Promise<string | null>;
  has(provider: string): Promise<boolean>;
  delete(provider: string): Promise<void>;
}

/**
 * The boundary between `@ascendant/app` and the host it's running on
 * (plan decision #5). Two implementations: `tauri` (the desktop app) and
 * `browser` (sql.js, in memory — powers `pnpm dev:web`, Playwright's visual
 * checks, and later the web demo). `timer` and `media` are added in phase 5.
 */
export interface Platform {
  sql: SqlExecutor;
  keychain: Keychain;
  /** `tauri-plugin-http`'s fetch in the desktop app (avoids CORS); the global fetch elsewhere. */
  fetch: typeof fetch;
  kind: 'tauri' | 'browser';
}
