import { createRepos, type Db, type Repos, type SqlExecutor } from '@ascendant/db';
import { mergeRuleset, type Ruleset } from '@ascendant/engine';
import { getDb, getPlatform } from '../platform';

/**
 * Everything a service needs: the repos to read with, the merged ruleset
 * to compute with, and the raw executor for `runAtomic` grouped writes
 * (spec 6.1 — "writes activities, tasks and events in one transaction").
 * Services never call the engine's pure functions with `Date.now()`
 * themselves; `now` is threaded through from whoever triggered the action.
 */
export interface ServiceContext {
  db: Db;
  sql: SqlExecutor;
  repos: Repos;
  ruleset: Ruleset;
}

export async function createServiceContext(): Promise<ServiceContext> {
  const platform = await getPlatform();
  const db = await getDb();
  const repos = createRepos(db);
  const settingsRow = await repos.settings.get();
  const ruleset = mergeRuleset(
    (settingsRow?.rulesetOverrides as Parameters<typeof mergeRuleset>[0]) ?? null,
  );
  return { db, sql: platform.sql, repos, ruleset };
}
