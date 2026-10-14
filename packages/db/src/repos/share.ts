import { eq } from 'drizzle-orm';
import { shareQueue } from '../schema';
import type { Db } from './types';

export type ShareQueueRow = typeof shareQueue.$inferSelect;
export type NewShareQueueRow = typeof shareQueue.$inferInsert;

export function createShareQueueRepo(db: Db) {
  return {
    async create(row: NewShareQueueRow): Promise<void> {
      await db.insert(shareQueue).values(row);
    },
    async listPending(): Promise<ShareQueueRow[]> {
      return db.select().from(shareQueue).where(eq(shareQueue.status, 'pending'));
    },
    async updateStatus(id: string, status: ShareQueueRow['status'], sentAt?: number): Promise<void> {
      await db.update(shareQueue).set({ status, sentAt }).where(eq(shareQueue.id, id));
    },
  };
}
