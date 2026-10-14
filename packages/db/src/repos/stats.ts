import { eq } from 'drizzle-orm';
import { stats } from '../schema';
import type { StatCode } from '@ascendant/engine';
import type { Db } from './types';

export type StatRow = typeof stats.$inferSelect;
export type NewStatRow = typeof stats.$inferInsert;

export function createStatsRepo(db: Db) {
  return {
    async list(): Promise<StatRow[]> {
      return db.select().from(stats).orderBy(stats.sort);
    },
    async getByCode(code: StatCode): Promise<StatRow | undefined> {
      const rows = await db.select().from(stats).where(eq(stats.code, code)).limit(1);
      return rows[0];
    },
    async create(row: NewStatRow): Promise<void> {
      await db.insert(stats).values(row);
    },
    async update(id: string, patch: Partial<NewStatRow>): Promise<void> {
      await db.update(stats).set(patch).where(eq(stats.id, id));
    },
  };
}
