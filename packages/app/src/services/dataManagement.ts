/**
 * Spec 10.16's Data section — export (JSON full backup, CSV of the log),
 * import (JSON restore) and delete-all. The schema only enforces two
 * foreign keys (entry_items -> entries, daily_completions -> dailies), so
 * insert/delete order only needs to respect those two pairs.
 */
import { schema, runAtomic, type Db } from '@ascendant/db';
import type { ServiceContext } from './context';

const TABLES_PARENT_FIRST = [
  { name: 'profile', table: schema.profile },
  { name: 'settings', table: schema.settings },
  { name: 'stats', table: schema.stats },
  { name: 'entries', table: schema.entries },
  { name: 'entryItems', table: schema.entryItems },
  { name: 'activities', table: schema.activities },
  { name: 'tasks', table: schema.tasks },
  { name: 'dailies', table: schema.dailies },
  { name: 'dailyCompletions', table: schema.dailyCompletions },
  { name: 'mainQuests', table: schema.mainQuests },
  { name: 'skills', table: schema.skills },
  { name: 'skillSuggestions', table: schema.skillSuggestions },
  { name: 'titles', table: schema.titles },
  { name: 'rankTrials', table: schema.rankTrials },
  { name: 'timerSessions', table: schema.timerSessions },
  { name: 'shields', table: schema.shields },
  { name: 'xpEvents', table: schema.xpEvents },
  { name: 'statEvents', table: schema.statEvents },
  { name: 'hpEvents', table: schema.hpEvents },
  { name: 'systemMessages', table: schema.systemMessages },
  { name: 'chatMessages', table: schema.chatMessages },
  { name: 'musicTracks', table: schema.musicTracks },
  { name: 'shareQueue', table: schema.shareQueue },
] as const;

export type DataExport = Record<string, Record<string, unknown>[]>;

export async function exportAllDataJson(ctx: ServiceContext): Promise<DataExport> {
  const out: DataExport = {};
  for (const { name, table } of TABLES_PARENT_FIRST) {
    out[name] = (await ctx.db.select().from(table as never)) as Record<string, unknown>[];
  }
  return out;
}

/** Spec 10.12's Log tab, as CSV: one row per activity. */
export async function exportLogCsv(ctx: ServiceContext): Promise<string> {
  const activities = await ctx.repos.activities.listBetween(0, Date.now());
  const header = 'date,title,duration_min,intensity,xp';
  const rows = activities.map((a) =>
    [new Date(a.startedAt).toISOString(), csvEscape(a.title), String(a.durationMin), csvEscape(a.intensity), String(a.xp)].join(
      ',',
    ),
  );
  return [header, ...rows].join('\n');
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function importAllDataJson(ctx: ServiceContext, data: DataExport): Promise<void> {
  const db: Db = ctx.db;
  const deleteWrites = [...TABLES_PARENT_FIRST].reverse().map(({ table }) => db.delete(table as never));
  await runAtomic(ctx.sql, deleteWrites as Parameters<typeof runAtomic>[1]);

  const insertWrites: unknown[] = [];
  for (const { name, table } of TABLES_PARENT_FIRST) {
    const rows = data[name];
    if (!rows || rows.length === 0) continue;
    insertWrites.push(db.insert(table as never).values(rows as never));
  }
  await runAtomic(ctx.sql, insertWrites as Parameters<typeof runAtomic>[1]);
}

export async function deleteAllData(ctx: ServiceContext): Promise<void> {
  const db: Db = ctx.db;
  const deleteWrites = [...TABLES_PARENT_FIRST].reverse().map(({ table }) => db.delete(table as never));
  await runAtomic(ctx.sql, deleteWrites as Parameters<typeof runAtomic>[1]);
}
