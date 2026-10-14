import { eq } from 'drizzle-orm';
import { titles } from '../schema';
import type { Db } from './types';
import type { TitleKey } from '@ascendant/engine';

export type TitleRow = typeof titles.$inferSelect;
export type NewTitleRow = typeof titles.$inferInsert;

export function createTitlesRepo(db: Db) {
  return {
    async createMany(rows: NewTitleRow[]): Promise<void> {
      if (rows.length === 0) return;
      await db.insert(titles).values(rows);
    },
    async list(): Promise<TitleRow[]> {
      return db.select().from(titles);
    },
    async getByKey(key: TitleKey): Promise<TitleRow | undefined> {
      const rows = await db.select().from(titles).where(eq(titles.key, key)).limit(1);
      return rows[0];
    },
    async markEarned(id: string, earnedAt: number): Promise<void> {
      await db.update(titles).set({ earnedAt }).where(eq(titles.id, id));
    },
  };
}
