/** Spec 5.1, 5.2, 5.9 — logs an activity: computes XP, stat XP and plausibility, writes atomically. */
import { newId, runAtomic, schema, type NewActivityRow } from '@ascendant/db';
import {
  checkPlausibility,
  computeActivityXp,
  skillLevel,
  statValue,
  type Intensity,
  type PlausibilityState,
  type StatCode,
  type StatWeights,
} from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import { localDayBounds } from '../lib/localTime';
import type { ServiceContext } from './context';
import { applyXpToProfile } from './profileXp';

export interface LogActivityInput {
  title: string;
  activityClass: string;
  durationMin: number;
  intensity: Intensity;
  distanceKm: number | null;
  pages: number | null;
  statWeights: StatWeights;
  skillId?: string | null;
  entryItemId?: string | null;
  /** Set when this activity is the credit for a finished focus session (spec 5.7). */
  timerSessionId?: string | null;
  startedAt: number;
  /** Set by the caller once the user confirms a flagged item. */
  plausibilityOverride?: PlausibilityState;
  now: number;
}

export interface LogActivityResult {
  activityId: string;
  xp: number;
  flagged: boolean;
  plausibilityReasons: string[];
  levelsGained: number;
  newLevel: number;
}

export interface ActivityXpPreview {
  xpResult: ReturnType<typeof computeActivityXp>;
  plausibility: PlausibilityState;
  plausibilityCheck: ReturnType<typeof checkPlausibility>;
}

/**
 * The read-and-compute half of logActivity, with no writes — shared so the
 * confirm card's XP/stat preview can never drift from what accepting actually
 * credits (both call this).
 */
export async function computeActivityXpForInput(
  ctx: ServiceContext,
  input: Pick<
    LogActivityInput,
    'activityClass' | 'durationMin' | 'intensity' | 'distanceKm' | 'pages' | 'statWeights' | 'plausibilityOverride' | 'now'
  >,
): Promise<ActivityXpPreview> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('computeActivityXpForInput: no profile row');

  const { startMs, endMs } = localDayBounds(input.now, profile.timezone);
  const totalLoggedTodayMinutes =
    (await ctx.repos.activities.totalMinutesBetween(startMs, endMs)) + input.durationMin;

  const plausibilityCheck = checkPlausibility(
    {
      activityClass: input.activityClass,
      durationMin: input.durationMin,
      distanceKm: input.distanceKm,
      pages: input.pages,
      xp: input.durationMin > 0 ? 1 : 0, // only used for the "0 duration, nonzero xp" rule
      totalLoggedTodayMinutes,
    },
    ctx.ruleset,
  );
  const plausibility: PlausibilityState =
    input.plausibilityOverride ?? (plausibilityCheck.flagged ? 'flagged' : 'ok');

  const statCodes = Object.keys(input.statWeights) as StatCode[];
  const statEventsToday = await ctx.repos.events.listStatBetween(startMs, endMs);
  const statXpEarnedTodayByCode: Partial<Record<StatCode, number>> = {};
  for (const code of statCodes) {
    statXpEarnedTodayByCode[code] = statEventsToday
      .filter((e) => e.statCode === code)
      .reduce((sum, e) => sum + Math.max(0, e.statXp), 0);
  }

  const xpResult = computeActivityXp(
    {
      durationMin: input.durationMin,
      intensity: input.intensity,
      statWeights: input.statWeights,
      statXpEarnedTodayByCode,
      inPenaltyZone: profile.penaltyZoneSince != null,
      plausibility,
    },
    ctx.ruleset,
  );

  return { xpResult, plausibility, plausibilityCheck };
}

export async function logActivity(ctx: ServiceContext, input: LogActivityInput): Promise<LogActivityResult> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('logActivity: no profile row');

  const { xpResult, plausibility, plausibilityCheck } = await computeActivityXpForInput(ctx, input);
  const statCodes = Object.keys(input.statWeights) as StatCode[];

  const activityId = newId();
  const activityRow: NewActivityRow = {
    id: activityId,
    createdAt: input.now,
    updatedAt: input.now,
    entryItemId: input.entryItemId,
    title: input.title,
    skillId: input.skillId,
    startedAt: input.startedAt,
    durationMin: input.durationMin,
    intensity: input.intensity,
    distanceKm: input.distanceKm,
    statWeights: input.statWeights,
    xp: xpResult.xpFinal,
    multiplier: xpResult.capFactor * xpResult.penaltyFactor * xpResult.plausibilityFactor,
    timerSessionId: input.timerSessionId,
  };

  const xpApplied = await applyXpToProfile(ctx, profile, xpResult.xpFinal, ctx.ruleset, input.now, 'activity', {
    refType: 'activity',
    refId: activityId,
  });

  const writes: unknown[] = [ctx.db.insert(schema.activities).values(activityRow), ...xpApplied.writes];

  for (const code of statCodes) {
    const statXpGain = xpResult.perStatXp[code] ?? 0;
    if (statXpGain === 0) continue;
    const statRow = await ctx.repos.stats.getByCode(code);
    if (!statRow) continue;
    const newStatXp = Math.max(0, statRow.statXp + statXpGain);
    writes.push(
      ctx.db
        .insert(schema.statEvents)
        .values({
          id: newId(),
          createdAt: input.now,
          updatedAt: input.now,
          at: input.now,
          statCode: code,
          statXp: statXpGain,
          refType: 'activity',
          refId: activityId,
        }),
      ctx.db
        .update(schema.stats)
        .set({
          statXp: newStatXp,
          value: statValue(newStatXp, ctx.ruleset),
          lastTrainedAt: input.now,
          updatedAt: input.now,
        })
        .where(eq(schema.stats.id, statRow.id)),
    );
  }

  // Spec 5.8: skill XP = activity XP.
  if (input.skillId) {
    const skillRow = await ctx.repos.skills.getById(input.skillId);
    if (skillRow) {
      const newSkillXp = skillRow.xp + xpResult.xpFinal;
      writes.push(
        ctx.db
          .update(schema.skills)
          .set({
            xp: newSkillXp,
            level: skillLevel(newSkillXp, ctx.ruleset),
            minutes: skillRow.minutes + input.durationMin,
            lastTrainedAt: input.now,
            updatedAt: input.now,
          })
          .where(eq(schema.skills.id, input.skillId)),
      );
    }
  }

  await runAtomic(ctx.sql, writes as Parameters<typeof runAtomic>[1]);

  return {
    activityId,
    xp: xpResult.xpFinal,
    flagged: plausibility === 'flagged',
    plausibilityReasons: plausibilityCheck.reasons,
    levelsGained: xpApplied.levelsGained,
    newLevel: xpApplied.newLevel,
  };
}
