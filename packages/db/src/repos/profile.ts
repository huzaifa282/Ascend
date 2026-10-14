import { eq } from 'drizzle-orm';
import { profile } from '../schema';
import type { Db } from './types';

export type ProfileRow = typeof profile.$inferSelect;
export type NewProfileRow = typeof profile.$inferInsert;

export function createProfileRepo(db: Db) {
  return {
    /** The profile table is a single row (spec 4.1). */
    async get(): Promise<ProfileRow | undefined> {
      const rows = await db.select().from(profile).limit(1);
      return rows[0];
    },
    async create(row: NewProfileRow): Promise<void> {
      await db.insert(profile).values(row);
    },
    async update(id: string, patch: Partial<NewProfileRow>): Promise<void> {
      await db.update(profile).set(patch).where(eq(profile.id, id));
    },
  };
}
