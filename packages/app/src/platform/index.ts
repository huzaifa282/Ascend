import { createDb, type Db } from '@ascendant/db';
import { createTauriSqlExecutor } from './tauri';
import type { Platform } from './types';

export type { Platform } from './types';
export { createTauriSqlExecutor } from './tauri';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let platformPromise: Promise<Platform> | null = null;

/**
 * Resolves once; the same Platform (and its one Db) is reused all session.
 * The sql.js browser adapter (and its 600KB+ wasm asset) is loaded with a
 * dynamic import so Tauri builds — which never take this branch — don't
 * bundle it into the eagerly-loaded main entry (see docs/decisions.md).
 */
export function getPlatform(): Promise<Platform> {
  if (!platformPromise) {
    platformPromise = isTauri()
      ? Promise.resolve<Platform>({ sql: createTauriSqlExecutor(), kind: 'tauri' })
      : import('./browser').then(({ createBrowserSqlExecutor }) =>
          createBrowserSqlExecutor().then((sql) => ({ sql, kind: 'browser' }) satisfies Platform),
        );
  }
  return platformPromise;
}

let dbPromise: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = getPlatform().then((platform) => createDb(platform.sql));
  }
  return dbPromise;
}

/** Test-only escape hatch: forces the next getPlatform()/getDb() to re-resolve. */
export function resetPlatformForTests(): void {
  platformPromise = null;
  dbPromise = null;
}
