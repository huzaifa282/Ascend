import { and, eq, gte, isNotNull, lt } from 'drizzle-orm';
import { tasks } from '../schema';
import type { Db } from './types';

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

export function createTasksRepo(db: Db) {
  return {
    async create(row: NewTaskRow): Promise<void> {
      await db.insert(tasks).values(row);
    },
    async getById(id: string): Promise<TaskRow | undefined> {
      const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      return rows[0];
    },
    async update(id: string, patch: Partial<NewTaskRow>): Promise<void> {
      await db.update(tasks).set(patch).where(eq(tasks.id, id));
    },
    async listOpen(): Promise<TaskRow[]> {
      return db.select().from(tasks).where(eq(tasks.status, 'open'));
    },
    /** Open tasks already past due — used for overdue counts and Penalty Zone recovery (5.4). */
    async listOverdue(nowMs: number): Promise<TaskRow[]> {
      return db
        .select()
        .from(tasks)
        .where(and(eq(tasks.status, 'open'), isNotNull(tasks.dueAt), lt(tasks.dueAt, nowMs)));
    },
    /** Tasks that were already overdue when Penalty Zone began and were completed since (spec 5.4's recovery path). */
    async countCompletedOverdueSince(sinceMs: number): Promise<number> {
      const rows = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.status, 'done'),
            isNotNull(tasks.completedAt),
            gte(tasks.completedAt, sinceMs),
            isNotNull(tasks.dueAt),
            lt(tasks.dueAt, sinceMs),
          ),
        );
      return rows.length;
    },
  };
}
