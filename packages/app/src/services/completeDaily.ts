/** Spec 5.6 — completing a daily quest (checkbox, auto-match, or a linked timer session). */
import { newId, runAtomic, schema } from '@ascendant/db';
import { statValue, type StatCode } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import { localDateString } from '../lib/localTime';
import type { ServiceContext } from './context';
import { applyXpToProfile } from './profileXp';

export interface CompleteDailyResult {
  alreadyDone: boolean;
  xp: number;
  levelsGained: number;
  newLevel: number;
}

export async function completeDaily(
  ctx: ServiceContext,
  dailyId: string,
  now: number,
  activityId?: string | null,
): Promise<CompleteDailyResult> {
  const daily = await ctx.repos.dailies.getById(dailyId);
  if (!daily) throw new Error(`completeDaily: daily ${dailyId} not found`);
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('completeDaily: no profile row');

  const localDate = localDateString(now, profile.timezone);
  const existing = await ctx.repos.dailyCompletions.getForDailyAndDate(dailyId, localDate);
  if (existing) {
    return { alreadyDone: true, xp: 0, levelsGained: 0, newLevel: profile.level };
  }

  const writes: unknown[] = [
    ctx.db.insert(schema.dailyCompletions).values({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      dailyId,
      localDate,
      completedAt: now,
      activityId,
    }),
  ];

  const xpApplied = await applyXpToProfile(ctx, profile, daily.xp, ctx.ruleset, now, 'daily', {
    refType: 'daily',
    refId: dailyId,
  });
  writes.push(...xpApplied.writes);

  const statWeights = (daily.statWeights as Partial<Record<StatCode, number>>) ?? {};
  for (const [code, weight] of Object.entries(statWeights) as [StatCode, number][]) {
    const statXpGain = Math.round(daily.xp * weight);
    if (statXpGain === 0) continue;
    const statRow = await ctx.repos.stats.getByCode(code);
    if (!statRow) continue;
    const newStatXp = statRow.statXp + statXpGain;
    writes.push(
      ctx.db.insert(schema.statEvents).values({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        at: now,
        statCode: code,
        statXp: statXpGain,
        refType: 'daily',
        refId: dailyId,
      }),
      ctx.db
        .update(schema.stats)
        .set({ statXp: newStatXp, value: statValue(newStatXp, ctx.ruleset), lastTrainedAt: now, updatedAt: now })
        .where(eq(schema.stats.id, statRow.id)),
    );
  }

  await runAtomic(ctx.sql, writes as Parameters<typeof runAtomic>[1]);
  return { alreadyDone: false, xp: daily.xp, levelsGained: xpApplied.levelsGained, newLevel: xpApplied.newLevel };
}
