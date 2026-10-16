/** Spec 5.2 — Activity XP. */
import type { ActivityType } from './activityType';
import type { Ruleset } from './ruleset';
import type { Intensity, StatCode, StatWeights } from './types';

export type PlausibilityState = 'ok' | 'flagged' | 'confirmed';

export interface ActivityXpInput {
  durationMin: number;
  intensity: Intensity;
  /** What the activity *is* — picks the type rate, separate from how hard or how long. */
  activityType: ActivityType;
  statWeights: StatWeights;
  /** Stat XP each trained stat has already received today, before this activity. */
  statXpEarnedTodayByCode: Partial<Record<StatCode, number>>;
  inPenaltyZone: boolean;
  plausibility: PlausibilityState;
}

export interface ActivityXpResult {
  xpRaw: number;
  /** Weight-averaged cap factor across the activity's stats. */
  capFactor: number;
  perStatCapFactor: Partial<Record<StatCode, number>>;
  penaltyFactor: number;
  plausibilityFactor: number;
  xpFinal: number;
  /** Stat XP per trained stat, using the final (capped) activity XP. */
  perStatXp: Partial<Record<StatCode, number>>;
  /** True for any stat whose contribution was reduced by the daily cap. */
  wasCapped: boolean;
  cappedStats: StatCode[];
}

/**
 * Per-stat daily soft cap: once a stat has received `statDailyCap` stat XP
 * today, further stat XP to it is multiplied by `capFactorReduced`.
 * Binary threshold on the amount already earned *before* this activity —
 * exactly at the cap already counts as capped (spec: "cap boundary exactly
 * at 120").
 */
function perStatCapFactorFor(alreadyEarned: number, ruleset: Ruleset): number {
  return alreadyEarned >= ruleset.activityXp.statDailyCap
    ? ruleset.activityXp.capFactorReduced
    : 1;
}

/**
 * Applies the ruleset's duration tiers: minutes within the first tier's
 * bracket count fully, minutes in later brackets count less — diminishing
 * returns so a 4-hour session isn't worth 4x a 1-hour one.
 */
export function effectiveMinutes(durationMin: number, ruleset: Ruleset): number {
  const tiers = ruleset.activityXp.durationTiers;
  let remaining = durationMin;
  let prevBound = 0;
  let total = 0;
  for (const tier of tiers) {
    const bracketSize = tier.upToMin - prevBound;
    const minutesInBracket = Math.min(remaining, bracketSize);
    if (minutesInBracket > 0) total += minutesInBracket * tier.rate;
    remaining -= minutesInBracket;
    prevBound = tier.upToMin;
    if (remaining <= 0) break;
  }
  // Only reachable if durationMin exceeds the last tier's upToMin (it
  // shouldn't, once capped at durationCapMinutes) — fall back to the last
  // tier's rate rather than silently dropping those minutes.
  if (remaining > 0 && tiers.length > 0) {
    total += remaining * tiers[tiers.length - 1]!.rate;
  }
  return total;
}

export function computeActivityXp(input: ActivityXpInput, ruleset: Ruleset): ActivityXpResult {
  const cappedDuration = Math.min(input.durationMin, ruleset.activityXp.durationCapMinutes);
  const xpRaw =
    cappedDuration > 0
      ? Math.round(
          (ruleset.activityXp.completionBonus + effectiveMinutes(cappedDuration, ruleset)) *
            ruleset.activityXp.baseRate *
            ruleset.activityXp.typeRate[input.activityType] *
            ruleset.activityXp.intensity[input.intensity],
        )
      : 0;

  const statEntries = Object.entries(input.statWeights) as [StatCode, number][];
  const perStatCapFactor: Partial<Record<StatCode, number>> = {};
  const cappedStats: StatCode[] = [];
  let capFactor = 0;
  for (const [code, weight] of statEntries) {
    const alreadyEarned = input.statXpEarnedTodayByCode[code] ?? 0;
    const factor = perStatCapFactorFor(alreadyEarned, ruleset);
    perStatCapFactor[code] = factor;
    if (factor < 1) cappedStats.push(code);
    capFactor += weight * factor;
  }

  const penaltyFactor = input.inPenaltyZone ? ruleset.penalty.factor : 1;
  const plausibilityFactor =
    input.plausibility === 'flagged'
      ? ruleset.plausibilityFactor.flagged
      : ruleset.plausibilityFactor.confirmed;

  const xpFinal = Math.round(xpRaw * capFactor * penaltyFactor * plausibilityFactor);

  const perStatXp: Partial<Record<StatCode, number>> = {};
  for (const [code, weight] of statEntries) {
    perStatXp[code] = Math.round(xpFinal * weight);
  }

  return {
    xpRaw,
    capFactor,
    perStatCapFactor,
    penaltyFactor,
    plausibilityFactor,
    xpFinal,
    perStatXp,
    wasCapped: cappedStats.length > 0,
    cappedStats,
  };
}
