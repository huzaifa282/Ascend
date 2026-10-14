import { desc, eq } from 'drizzle-orm';
import { entries, entryItems } from '../schema';
import type { Db } from './types';

export type EntryRow = typeof entries.$inferSelect;
export type NewEntryRow = typeof entries.$inferInsert;
export type EntryItemRow = typeof entryItems.$inferSelect;
export type NewEntryItemRow = typeof entryItems.$inferInsert;

export function createEntriesRepo(db: Db) {
  return {
    async create(row: NewEntryRow): Promise<void> {
      await db.insert(entries).values(row);
    },
    async getById(id: string): Promise<EntryRow | undefined> {
      const rows = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
      return rows[0];
    },
    async update(id: string, patch: Partial<NewEntryRow>): Promise<void> {
      await db.update(entries).set(patch).where(eq(entries.id, id));
    },
    async listRecent(limit = 50): Promise<EntryRow[]> {
      return db.select().from(entries).orderBy(desc(entries.createdAt)).limit(limit);
    },
  };
}

export function createEntryItemsRepo(db: Db) {
  return {
    async createMany(rows: NewEntryItemRow[]): Promise<void> {
      if (rows.length === 0) return;
      await db.insert(entryItems).values(rows);
    },
    async listByEntry(entryId: string): Promise<EntryItemRow[]> {
      return db.select().from(entryItems).where(eq(entryItems.entryId, entryId));
    },
    async getById(id: string): Promise<EntryItemRow | undefined> {
      const rows = await db.select().from(entryItems).where(eq(entryItems.id, id)).limit(1);
      return rows[0];
    },
    async update(id: string, patch: Partial<NewEntryItemRow>): Promise<void> {
      await db.update(entryItems).set(patch).where(eq(entryItems.id, id));
    },
  };
}
