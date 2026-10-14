import { eq } from 'drizzle-orm';
import { skillSuggestions, skills } from '../schema';
import type { Db } from './types';

export type SkillRow = typeof skills.$inferSelect;
export type NewSkillRow = typeof skills.$inferInsert;
export type SkillSuggestionRow = typeof skillSuggestions.$inferSelect;
export type NewSkillSuggestionRow = typeof skillSuggestions.$inferInsert;

export function createSkillsRepo(db: Db) {
  return {
    async create(row: NewSkillRow): Promise<void> {
      await db.insert(skills).values(row);
    },
    async update(id: string, patch: Partial<NewSkillRow>): Promise<void> {
      await db.update(skills).set(patch).where(eq(skills.id, id));
    },
    async list(): Promise<SkillRow[]> {
      return db.select().from(skills);
    },
    async getByName(name: string): Promise<SkillRow | undefined> {
      const rows = await db.select().from(skills).where(eq(skills.name, name)).limit(1);
      return rows[0];
    },
  };
}

export function createSkillSuggestionsRepo(db: Db) {
  return {
    async create(row: NewSkillSuggestionRow): Promise<void> {
      await db.insert(skillSuggestions).values(row);
    },
    async update(id: string, patch: Partial<NewSkillSuggestionRow>): Promise<void> {
      await db.update(skillSuggestions).set(patch).where(eq(skillSuggestions.id, id));
    },
    async listOpen(): Promise<SkillSuggestionRow[]> {
      return db.select().from(skillSuggestions).where(eq(skillSuggestions.status, 'open'));
    },
    async getByName(name: string): Promise<SkillSuggestionRow | undefined> {
      const rows = await db.select().from(skillSuggestions).where(eq(skillSuggestions.name, name)).limit(1);
      return rows[0];
    },
  };
}
