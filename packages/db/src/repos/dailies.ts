import { and, eq } from 'drizzle-orm';
import { dailies, dailyCompletions } from '../schema';
import type { Db } from './types';

export type DailyRow = typeof dailies.$inferSelect;
export type NewDailyRow = typeof dailies.$inferInsert;
export type DailyCompletionRow = typeof dailyCompletions.$inferSelect;
export type NewDailyCompletionRow = typeof dailyCompletions.$inferInsert;

export function createDailiesRepo(db: Db) {
  return {
    async create(row: NewDailyRow): Promise<void> {
      await db.insert(dailies).values(row);
    },
    async getById(id: string): Promise<DailyRow | undefined> {
      const rows = await db.select().from(dailies).where(eq(dailies.id, id)).limit(1);
      return rows[0];
    },
    async update(id: string, patch: Partial<NewDailyRow>): Promise<void> {
      await db.update(dailies).set(patch).where(eq(dailies.id, id));
    },
    async listActive(): Promise<DailyRow[]> {
      return db.select().from(dailies).where(eq(dailies.active, true)).orderBy(dailies.sort);
    },
    async listAll(): Promise<DailyRow[]> {
      return db.select().from(dailies).orderBy(dailies.sort);
    },
  };
}

export function createDailyCompletionsRepo(db: Db) {
  return {
    async create(row: NewDailyCompletionRow): Promise<void> {
      await db.insert(dailyCompletions).values(row);
    },
    async listForDate(localDate: string): Promise<DailyCompletionRow[]> {
      return db.select().from(dailyCompletions).where(eq(dailyCompletions.localDate, localDate));
    },
    async getForDailyAndDate(dailyId: string, localDate: string): Promise<DailyCompletionRow | undefined> {
      const rows = await db
        .select()
        .from(dailyCompletions)
        .where(and(eq(dailyCompletions.dailyId, dailyId), eq(dailyCompletions.localDate, localDate)))
        .limit(1);
      return rows[0];
    },
  };
}
