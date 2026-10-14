import type { SqlExecutor } from '@ascendant/db';

/**
 * The boundary between `@ascendant/app` and the host it's running on
 * (plan decision #5). Two implementations: `tauri` (the desktop app) and
 * `browser` (sql.js, in memory — powers `pnpm dev:web`, Playwright's visual
 * checks, and later the web demo). Later phases add `keychain`, `timer`,
 * `media` and `http` here as those features come online.
 */
export interface Platform {
  sql: SqlExecutor;
  kind: 'tauri' | 'browser';
}
