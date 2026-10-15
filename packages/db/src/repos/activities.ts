import { and, between, desc, eq, gte, isNotNull, max, sum } from 'drizzle-orm';
import { activities } from '../schema';
import type { Db } from './types';

export type ActivityRow = typeof activities.$inferSelect;
export type NewActivityRow = typeof activities.$inferInsert;

export function createActivitiesRepo(db: Db) {
  return {
    async create(row: NewActivityRow): Promise<void> {
      await db.insert(activities).values(row);
    },
    async getById(id: string): Promise<ActivityRow | undefined> {
      const rows = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
      return rows[0];
    },
    async update(id: string, patch: Partial<NewActivityRow>): Promise<void> {
      await db.update(activities).set(patch).where(eq(activities.id, id));
    },
    async listBetween(startMs: number, endMs: number): Promise<ActivityRow[]> {
      return db
        .select()
        .from(activities)
        .where(between(activities.startedAt, startMs, endMs))
        .orderBy(desc(activities.startedAt));
    },
    async getByTimerSessionId(timerSessionId: string): Promise<ActivityRow | undefined> {
      const rows = await db
        .select()
        .from(activities)
        .where(eq(activities.timerSessionId, timerSessionId))
        .limit(1);
      return rows[0];
    },
    /** Total logged minutes in a window, for the plausibility "16h/day" check (spec 5.9). */
    async totalMinutesBetween(startMs: number, endMs: number): Promise<number> {
      const rows = await db
        .select({ total: sum(activities.durationMin) })
        .from(activities)
        .where(between(activities.startedAt, startMs, endMs));
      return Number(rows[0]?.total ?? 0);
    },
    /** The longest single credited focus session since `sinceMs` (Penalty Zone recovery's other path). */
    async maxFocusSessionMinutesSince(sinceMs: number): Promise<number> {
      const rows = await db
        .select({ max: max(activities.durationMin) })
        .from(activities)
        .where(and(isNotNull(activities.timerSessionId), gte(activities.startedAt, sinceMs)));
      return Number(rows[0]?.max ?? 0);
    },
  };
}
