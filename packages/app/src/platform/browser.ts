/**
 * sql.js (WASM, in-memory) adapter — powers `pnpm dev:web`, Playwright's
 * visual checks, and later the web demo (spec 13.1). It's a single
 * in-process object with no connection pooling, so unlike the Tauri
 * adapter, `batchAtomic` can safely use a plain BEGIN/COMMIT/ROLLBACK.
 */
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
// Vite resolves this to a hashed, served URL; no manual public-dir copy needed.
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import type { SqlBatchStatement, SqlExecuteResult, SqlExecutor, SqlSelectResult } from '@ascendant/db';

export async function createBrowserSqlExecutor(): Promise<SqlExecutor> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const db = new SQL.Database();
  return wrapSqlJsDatabase(db);
}

/** Exposed separately so tests can hand in a pre-seeded in-memory database. */
export function wrapSqlJsDatabase(db: Database): SqlExecutor {
  return {
    async select(sql: string, params: unknown[]): Promise<SqlSelectResult> {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params as never[]);
        const rows: unknown[][] = [];
        while (stmt.step()) {
          rows.push(stmt.get());
        }
        return { rows };
      } finally {
        stmt.free();
      }
    },
    async execute(sql: string, params: unknown[]): Promise<SqlExecuteResult> {
      db.run(sql, params as never[]);
      return { rowsAffected: db.getRowsModified(), lastInsertRowid: 0 };
    },
    async batchAtomic(statements: SqlBatchStatement[]): Promise<void> {
      db.exec('BEGIN');
      try {
        for (const statement of statements) {
          db.run(statement.sql, statement.params as never[]);
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}
