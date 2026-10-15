/**
 * Spec 5.4 — day close orchestration. Call this on local midnight or on
 * first app open after it; it processes every missed day in order (e.g.
 * after the app was closed for a few days), each as its own atomic write.
 */
import { newId, runAtomic, schema, type ProfileRow } from '@ascendant/db';
import { closeDay, statValue, trialProgress, type TrialDayRecord } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import {
  addLocalDays,
  daysBetweenLocalDates,
  localDateRange,
  localDateString,
  localDayBounds,
  localMidnightMs,
  localMonthString,
} from '../lib/localTime';
import type { ServiceContext } from './context';
import { buildHpEvent, buildSystemMessage } from './ledger';

export interface DayCloseDaySummary {
  date: string;
  hpDelta: number;
  streak: number;
  trialPassed: boolean;
  fromRank?: string;
  toRank?: string;
}

export async function dayClose(ctx: ServiceContext, now: number): Promise<DayCloseDaySummary[]> {
  let profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('dayClose: no profile row');

  const { localDate: today } = localDayBounds(now, profile.timezone);

  if (!profile.lastDayCloseDate) {
    // First run ever: nothing retroactive to close, just mark today as the baseline.
    await ctx.repos.profile.update(profile.id, { lastDayCloseDate: today, updatedAt: now });
    return [];
  }

  const daysToClose = localDateRange(profile.lastDayCloseDate, today).slice(0, -1); // up to, not including, today
  const summaries: DayCloseDaySummary[] = [];

  for (const date of daysToClose) {
    const summary = await closeOneDay(ctx, profile, date, now);
    summaries.push(summary);
    const refreshed = await ctx.repos.profile.get();
    if (!refreshed) throw new Error('dayClose: profile disappeared mid-run');
    profile = refreshed;
  }

  if (daysToClose.length > 0) {
    await ctx.repos.profile.update(profile.id, { lastDayCloseDate: daysToClose[daysToClose.length - 1], updatedAt: now });
  }

  return summaries;
}

async function closeOneDay(
  ctx: ServiceContext,
  profile: ProfileRow,
  date: string,
  now: number,
): Promise<DayCloseDaySummary> {
  const startMs = localMidnightMs(date, profile.timezone);
  const endMs = localMidnightMs(addLocalDays(date, 1), profile.timezone);

  const [activeDailies, completions, xpEvents, hpEvents, shieldRows, stats] = await Promise.all([
    ctx.repos.dailies.listActive(),
    ctx.repos.dailyCompletions.listForDate(date),
    ctx.repos.events.listXpBetween(startMs, endMs),
    ctx.repos.events.listHpBetween(startMs, endMs),
    ctx.repos.shields.listForMonth(localMonthString(date)),
    ctx.repos.stats.list(),
  ]);

  const dayXp = xpEvents.reduce((sum, e) => sum + e.amount, 0);
  const hpLossAlreadyAppliedToday = hpEvents.reduce((sum, e) => sum + Math.max(0, -e.delta), 0);
  const isShieldDay = shieldRows.some((s) => s.usedOn === date);
  const dailiesDoneCount = new Set(completions.map((c) => c.dailyId)).size;

  const activeTrial = await ctx.repos.rankTrials.getActive();

  const statInputs = stats.map((s) => {
    const trainedDate = s.lastTrainedAt ? localDateString(s.lastTrainedAt, profile.timezone) : null;
    const daysSinceTrained = trainedDate ? daysBetweenLocalDates(trainedDate, date) : Number.POSITIVE_INFINITY;
    return { code: s.code, hidden: s.hidden, daysSinceTrained, currentStatXp: s.statXp };
  });

  const result = closeDay(
    {
      date,
      activeDailiesCount: activeDailies.length,
      dailiesDoneCount,
      isShieldDay,
      dayXp,
      currentStreak: profile.streakDays,
      hpLossAlreadyAppliedToday,
      stats: statInputs,
      trialDaysSoFar: activeTrial ? (activeTrial.days as TrialDayRecord[]) : undefined,
    },
    ctx.ruleset,
  );

  const writes: unknown[] = [];

  if (result.hp.appliedDelta !== 0) {
    writes.push(
      buildHpEvent(ctx.db, {
        at: now,
        delta: result.hp.appliedDelta,
        reason: result.hp.kind === 'all_done' ? 'all_dailies_done' : 'dailies_undone',
        cappedFrom: result.hp.cappedFrom,
        refType: 'day_close',
        refId: date,
      }),
    );
  }

  const newHp = Math.max(0, Math.min(ctx.ruleset.hp.max, profile.hp + result.hp.appliedDelta));
  writes.push(
    ctx.db
      .update(schema.profile)
      .set({
        hp: newHp,
        streakDays: result.streak.newStreak,
        penaltyZoneSince: newHp === 0 && profile.penaltyZoneSince == null ? now : profile.penaltyZoneSince,
        updatedAt: now,
      })
      .where(eq(schema.profile.id, profile.id)),
  );

  for (const decay of result.statDecay) {
    const statRow = stats.find((s) => s.code === decay.code);
    if (!statRow) continue;
    const newStatXp = Math.max(0, statRow.statXp - decay.amount);
    writes.push(
      ctx.db.insert(schema.statEvents).values({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        at: now,
        statCode: decay.code,
        statXp: -decay.amount,
        refType: 'decay',
        refId: date,
      }),
      ctx.db
        .update(schema.stats)
        .set({ statXp: newStatXp, value: statValue(newStatXp, ctx.ruleset), updatedAt: now })
        .where(eq(schema.stats.id, statRow.id)),
    );
  }

  let trialPassed = false;
  if (activeTrial && result.trialDay) {
    const days = [...(activeTrial.days as TrialDayRecord[]), result.trialDay];
    const progress = trialProgress(days, ctx.ruleset);
    trialPassed = progress.passed;
    writes.push(
      ctx.db
        .update(schema.rankTrials)
        .set({ days, status: trialPassed ? 'passed' : 'active', updatedAt: now })
        .where(eq(schema.rankTrials.id, activeTrial.id)),
    );
    if (trialPassed) {
      writes.push(
        ctx.db
          .update(schema.profile)
          .set({ rank: activeTrial.toRank, updatedAt: now })
          .where(eq(schema.profile.id, profile.id)),
        buildSystemMessage(ctx.db, { at: now, kind: 'gain', templateKey: 'rank_up', params: { rank: activeTrial.toRank } }),
      );
    }
  }

  await runAtomic(ctx.sql, writes as Parameters<typeof runAtomic>[1]);

  return {
    date,
    hpDelta: result.hp.appliedDelta,
    streak: result.streak.newStreak,
    trialPassed,
    fromRank: trialPassed ? activeTrial?.fromRank : undefined,
    toRank: trialPassed ? activeTrial?.toRank : undefined,
  };
}
