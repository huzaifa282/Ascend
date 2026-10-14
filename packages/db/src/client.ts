/**
 * Wires a `SqlExecutor` (see executor.ts) into Drizzle's `sqlite-proxy`
 * driver. `db.transaction()` is deliberately not used — see
 * docs/decisions.md — grouped writes go through `runAtomic` instead.
 */
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import type { SqlExecutor } from './executor';

export type Db = SqliteRemoteDatabase<typeof schema>;

export function createDb(executor: SqlExecutor): Db {
  return drizzle(async (sql, params, method) => {
    if (method === 'run') {
      await executor.execute(sql, params);
      return { rows: [] };
    }
    const result = await executor.select(sql, params);
    if (method === 'get') {
      // sqlite-proxy expects a single flat row here, not an array of one row.
      return { rows: result.rows[0] ?? [] };
    }
    return { rows: result.rows };
  }, { schema });
}

/** A Drizzle query builder that can be inspected without being executed. */
interface ToSqlQuery {
  toSQL(): { sql: string; params: unknown[] };
}

/**
 * Runs several writes atomically (spec 6.1: "writes activities, tasks and
 * events in one transaction"). Pass query builders you have NOT awaited —
 * `runAtomic(executor, [db.insert(activities).values(a), db.insert(xpEvents).values(e)])`.
 * Every id must already be known (ULIDs are generated client-side), since
 * statements in the batch cannot see each other's results.
 */
export async function runAtomic(executor: SqlExecutor, queries: ToSqlQuery[]): Promise<void> {
  const statements = queries.map((q) => {
    const built = q.toSQL();
    return { sql: built.sql, params: built.params };
  });
  await executor.batchAtomic(statements);
}

export { schema };
export type * from './executor';
