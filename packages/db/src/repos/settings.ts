import { eq } from 'drizzle-orm';
import { settings } from '../schema';
import type { Db } from './types';

export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;

export function createSettingsRepo(db: Db) {
  return {
    /** The settings table is a single row (spec 4.1). */
    async get(): Promise<SettingsRow | undefined> {
      const rows = await db.select().from(settings).limit(1);
      return rows[0];
    },
    async create(row: NewSettingsRow): Promise<void> {
      await db.insert(settings).values(row);
    },
    async update(id: string, patch: Partial<NewSettingsRow>): Promise<void> {
      await db.update(settings).set(patch).where(eq(settings.id, id));
    },
  };
}
