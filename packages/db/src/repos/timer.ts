import { eq } from 'drizzle-orm';
import { timerSessions } from '../schema';
import type { Db } from './types';

export type TimerSessionRow = typeof timerSessions.$inferSelect;
export type NewTimerSessionRow = typeof timerSessions.$inferInsert;

export function createTimerSessionsRepo(db: Db) {
  return {
    async create(row: NewTimerSessionRow): Promise<void> {
      await db.insert(timerSessions).values(row);
    },
    async update(id: string, patch: Partial<NewTimerSessionRow>): Promise<void> {
      await db.update(timerSessions).set(patch).where(eq(timerSessions.id, id));
    },
    async getById(id: string): Promise<TimerSessionRow | undefined> {
      const rows = await db.select().from(timerSessions).where(eq(timerSessions.id, id)).limit(1);
      return rows[0];
    },
  };
}
