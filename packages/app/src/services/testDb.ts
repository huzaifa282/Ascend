/**
 * Node-only DB bootstrap for packages/app's own integration tests — mirrors
 * packages/seed/src/nodeDb.ts (kept separate: packages/app can't depend on
 * packages/seed, which itself depends on packages/app).
 */
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InitSqlJsStatic } from 'sql.js';
import { createDb, createRepos, newId, type Db, type Repos } from '@ascendant/db';
import { DEFAULT_RULESET } from '@ascendant/engine';
import { wrapSqlJsDatabase } from './../platform/browser';
import type { ServiceContext } from './context';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../../db/migrations');
const require = createRequire(import.meta.url);

export async function createTestServiceContext(): Promise<ServiceContext> {
  const initSqlJs: InitSqlJsStatic = require('sql.js');
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
  const db: Db = createDb(sql);
  const repos: Repos = createRepos(db);
  return { db, sql, repos, ruleset: DEFAULT_RULESET };
}

export async function seedMinimalProfile(ctx: ServiceContext, now: number): Promise<void> {
  await ctx.repos.profile.create({
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: 'Test',
    timezone: 'Asia/Karachi',
    tone: 'neutral',
    levelingEnabled: true,
    level: 1,
    xpIntoLevel: 0,
    totalXp: 0,
    rank: 'E',
    hp: 100,
    equippedTitleId: null,
    streakDays: 0,
    streakFrozenUntil: null,
    penaltyZoneSince: null,
    onboardingDone: true,
    lastDayCloseDate: null,
  });
  for (const code of ['STR', 'END', 'AGI', 'VIT', 'INT', 'FOC', 'CRE', 'CHA', 'DIS'] as const) {
    await ctx.repos.stats.create({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      code,
      name: code,
      sort: 0,
      hidden: false,
      statXp: 0,
      value: 0,
      lastTrainedAt: null,
    });
  }
}
