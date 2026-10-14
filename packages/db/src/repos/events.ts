import { between } from 'drizzle-orm';
import { hpEvents, statEvents, xpEvents } from '../schema';
import type { Db } from './types';
import type { Ledger } from '@ascendant/engine';

export type XpEventRow = typeof xpEvents.$inferSelect;
export type NewXpEventRow = typeof xpEvents.$inferInsert;
export type StatEventRow = typeof statEvents.$inferSelect;
export type NewStatEventRow = typeof statEvents.$inferInsert;
export type HpEventRow = typeof hpEvents.$inferSelect;
export type NewHpEventRow = typeof hpEvents.$inferInsert;

/**
 * The append-only event ledger (spec section 4). Nothing here ever updates
 * or deletes a row — `@ascendant/engine`'s `recalculate` is the only thing
 * that interprets these rows into totals.
 */
export function createEventsRepo(db: Db) {
  return {
    async appendXp(row: NewXpEventRow): Promise<void> {
      await db.insert(xpEvents).values(row);
    },
    async appendStat(row: NewStatEventRow): Promise<void> {
      await db.insert(statEvents).values(row);
    },
    async appendHp(row: NewHpEventRow): Promise<void> {
      await db.insert(hpEvents).values(row);
    },
    async listXpBetween(startMs: number, endMs: number): Promise<XpEventRow[]> {
      return db.select().from(xpEvents).where(between(xpEvents.at, startMs, endMs));
    },
    async listStatBetween(startMs: number, endMs: number): Promise<StatEventRow[]> {
      return db.select().from(statEvents).where(between(statEvents.at, startMs, endMs));
    },
    async listHpBetween(startMs: number, endMs: number): Promise<HpEventRow[]> {
      return db.select().from(hpEvents).where(between(hpEvents.at, startMs, endMs));
    },
    /** The full ledger, shaped for `@ascendant/engine`'s `recalculate()`. */
    async loadFullLedger(): Promise<Ledger> {
      const xp: XpEventRow[] = await db.select().from(xpEvents);
      const stat: StatEventRow[] = await db.select().from(statEvents);
      return {
        xpEvents: xp.map((e) => ({ atMs: e.at, amount: e.amount })),
        statEvents: stat.map((e) => ({ atMs: e.at, statCode: e.statCode, statXp: e.statXp })),
      };
    },
  };
}
