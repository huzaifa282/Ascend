/**
 * Calls the three rusqlite commands in `apps/desktop/src-tauri/src/commands/db.rs`.
 * See docs/decisions.md ("Custom rusqlite command layer instead of
 * tauri-plugin-sql") for why there's no pooled plugin underneath this.
 */
import { invoke } from '@tauri-apps/api/core';
import type { SqlBatchStatement, SqlExecuteResult, SqlExecutor, SqlSelectResult } from '@ascendant/db';

export function createTauriSqlExecutor(): SqlExecutor {
  return {
    select(sql: string, params: unknown[]): Promise<SqlSelectResult> {
      return invoke('db_select', { sql, params });
    },
    execute(sql: string, params: unknown[]): Promise<SqlExecuteResult> {
      return invoke('db_execute', { sql, params });
    },
    async batchAtomic(statements: SqlBatchStatement[]): Promise<void> {
      await invoke('db_batch_atomic', { statements });
    },
  };
}
