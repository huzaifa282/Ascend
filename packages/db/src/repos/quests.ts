import { eq } from 'drizzle-orm';
import { mainQuests } from '../schema';
import type { Db } from './types';

export type MainQuestRow = typeof mainQuests.$inferSelect;
export type NewMainQuestRow = typeof mainQuests.$inferInsert;

export function createMainQuestsRepo(db: Db) {
  return {
    async create(row: NewMainQuestRow): Promise<void> {
      await db.insert(mainQuests).values(row);
    },
    async update(id: string, patch: Partial<NewMainQuestRow>): Promise<void> {
      await db.update(mainQuests).set(patch).where(eq(mainQuests.id, id));
    },
    async list(): Promise<MainQuestRow[]> {
      return db.select().from(mainQuests);
    },
  };
}
