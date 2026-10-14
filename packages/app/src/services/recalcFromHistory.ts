/**
 * Settings > "Recalculate from history" (spec section 4): replays the full
 * xp/stat event ledger and overwrites the cached profile/stat totals with
 * what the ledger actually says, under the current ruleset.
 *
 * Rank is deliberately left untouched: it's gated by rank-trial history
 * (`rank_trials`), not purely derivable from XP, so `recalculate()`'s
 * `rawRank` is informational only here.
 */
import { schema } from '@ascendant/db';
import { recalculate, statValue, type RecalculateResult } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import type { ServiceContext } from './context';

export async function recalcFromHistory(ctx: ServiceContext, now: number): Promise<RecalculateResult> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('recalcFromHistory: no profile row');

  const ledger = await ctx.repos.events.loadFullLedger();
  const result = recalculate(ledger, ctx.ruleset);

  await ctx.db
    .update(schema.profile)
    .set({
      level: result.level,
      xpIntoLevel: result.xpIntoLevel,
      totalXp: result.totalXp,
      updatedAt: now,
    })
    .where(eq(schema.profile.id, profile.id));

  const statRows = await ctx.repos.stats.list();
  for (const stat of statRows) {
    const xp = result.statXp[stat.code] ?? 0;
    await ctx.repos.stats.update(stat.id, { statXp: xp, value: statValue(xp, ctx.ruleset), updatedAt: now });
  }

  return result;
}
