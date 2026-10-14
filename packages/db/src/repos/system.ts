import { desc, eq } from 'drizzle-orm';
import { chatMessages, systemMessages } from '../schema';
import type { Db } from './types';

export type SystemMessageRow = typeof systemMessages.$inferSelect;
export type NewSystemMessageRow = typeof systemMessages.$inferInsert;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type NewChatMessageRow = typeof chatMessages.$inferInsert;

export function createSystemMessagesRepo(db: Db) {
  return {
    async create(row: NewSystemMessageRow): Promise<void> {
      await db.insert(systemMessages).values(row);
    },
    async listRecent(limit = 50): Promise<SystemMessageRow[]> {
      return db.select().from(systemMessages).orderBy(desc(systemMessages.at)).limit(limit);
    },
    async markRead(id: string): Promise<void> {
      await db.update(systemMessages).set({ read: true }).where(eq(systemMessages.id, id));
    },
  };
}

export function createChatMessagesRepo(db: Db) {
  return {
    async create(row: NewChatMessageRow): Promise<void> {
      await db.insert(chatMessages).values(row);
    },
    async listRecent(limit = 50): Promise<ChatMessageRow[]> {
      return db.select().from(chatMessages).orderBy(desc(chatMessages.at)).limit(limit);
    },
  };
}
