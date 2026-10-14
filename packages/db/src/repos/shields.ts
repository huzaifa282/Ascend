import { eq } from 'drizzle-orm';
import { shields } from '../schema';
import type { Db } from './types';

export type ShieldRow = typeof shields.$inferSelect;
export type NewShieldRow = typeof shields.$inferInsert;

export function createShieldsRepo(db: Db) {
  return {
    async create(row: NewShieldRow): Promise<void> {
      await db.insert(shields).values(row);
    },
    /** One row per shield used this month ('YYYY-MM'); count = used, 2 - count = remaining. */
    async listForMonth(month: string): Promise<ShieldRow[]> {
      return db.select().from(shields).where(eq(shields.month, month));
    },
  };
}
