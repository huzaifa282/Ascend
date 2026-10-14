/**
 * Node-only DB bootstrap for the `pnpm seed` CLI (and its own tests) — a
 * fresh in-memory sql.js database with every migration applied. Not used by
 * the running app itself: the real "Load demo profile" action (phase 3+)
 * calls `generateSeed` through the app's own live `createServiceContext()`,
 * which resolves to the Tauri rusqlite executor instead.
 */
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InitSqlJsStatic } from 'sql.js';
import { createDb, type Db, type SqlExecutor } from '@ascendant/db';
// Deep import, not the `@ascendant/app` barrel: this Node-only script only
// needs the sql.js wrapper, not the whole app (React, routes, services).
import { wrapSqlJsDatabase } from '@ascendant/app/src/platform/browser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../db/migrations');
// Plain CJS require (not tsx's ESM resolver) for sql.js: its wasm-loading
// glue otherwise trips tsx's path-mapping hook under Node's ESM loader.
const require = createRequire(import.meta.url);

export async function createNodeDb(): Promise<{ db: Db; sql: SqlExecutor }> {
  const initSqlJs: InitSqlJsStatic = require('sql.js');
  // Resolve the package's main entry (its "exports" map doesn't expose
  // ./package.json) and derive the .wasm path from there.
  const sqlJsMain = require.resolve('sql.js');
  const wasmPath = join(dirname(sqlJsMain), 'sql-wasm.wasm');
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const database = new SQL.Database();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    database.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf-8'));
  }

  const sql = wrapSqlJsDatabase(database);
  return { db: createDb(sql), sql };
}
