/** Spec 5.2 — Activity XP. */
import type { Ruleset } from './ruleset';
import type { Intensity, StatCode, StatWeights } from './types';

export type PlausibilityState = 'ok' | 'flagged' | 'confirmed';

export interface ActivityXpInput {
  durationMin: number;
  intensity: Intensity;
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

export function computeActivityXp(input: ActivityXpInput, ruleset: Ruleset): ActivityXpResult {
  const cappedDuration = Math.min(input.durationMin, ruleset.activityXp.durationCapMinutes);
  const xpRaw = Math.round(
    cappedDuration * ruleset.activityXp.baseRate * ruleset.activityXp.intensity[input.intensity],
  );

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
