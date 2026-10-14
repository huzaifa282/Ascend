/**
 * The boundary between `@ascendant/db` and whatever actually talks to
 * SQLite. `packages/app/src/platform` provides two implementations: one
 * over the Tauri `db_select`/`db_execute`/`db_batch_atomic` commands (see
 * `apps/desktop/src-tauri/src/commands/db.rs` and docs/decisions.md), one
 * over `sql.js` for the browser/test adapter.
 */
export interface SqlSelectResult {
  /** Positional column values per row (Drizzle maps these to field names). */
  rows: unknown[][];
}

export interface SqlExecuteResult {
  rowsAffected: number;
  lastInsertRowid: number;
}

export interface SqlBatchStatement {
  sql: string;
  params: unknown[];
}

export interface SqlExecutor {
  select(sql: string, params: unknown[]): Promise<SqlSelectResult>;
  execute(sql: string, params: unknown[]): Promise<SqlExecuteResult>;
  /** The only place a real transaction is opened — see decisions.md. */
  batchAtomic(statements: SqlBatchStatement[]): Promise<void>;
}
