import { desc, eq } from 'drizzle-orm';
import { rankTrials } from '../schema';
import type { Db } from './types';

export type RankTrialRow = typeof rankTrials.$inferSelect;
export type NewRankTrialRow = typeof rankTrials.$inferInsert;

export function createRankTrialsRepo(db: Db) {
  return {
    async create(row: NewRankTrialRow): Promise<void> {
      await db.insert(rankTrials).values(row);
    },
    async update(id: string, patch: Partial<NewRankTrialRow>): Promise<void> {
      await db.update(rankTrials).set(patch).where(eq(rankTrials.id, id));
    },
    async getActive(): Promise<RankTrialRow | undefined> {
      const rows = await db
        .select()
        .from(rankTrials)
        .where(eq(rankTrials.status, 'active'))
        .orderBy(desc(rankTrials.startedAt))
        .limit(1);
      return rows[0];
    },
  };
}
