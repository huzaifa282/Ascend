/** Spec 5.1 — Stats: value curve, level, today's gain, neglect decay. */
import type { Ruleset } from './ruleset';
import type { StatCode } from './types';

export const STAT_VALUE_CAP = 99;

/** value(stat_xp) = floor(100 * (1 - exp(-stat_xp / STAT_SCALE))), capped at 99. */
export function statValue(statXp: number, ruleset: Ruleset): number {
  const safeXp = Math.max(0, statXp);
  const raw = Math.floor(100 * (1 - Math.exp(-safeXp / ruleset.stats.statScale)));
  return Math.min(STAT_VALUE_CAP, raw);
}

/** stat_level = floor(value / 10). */
export function statLevel(value: number): number {
  return Math.floor(value / 10);
}

/** today_gain = value(now) - value(at local midnight). */
export function statTodayGain(xpNow: number, xpAtMidnight: number, ruleset: Ruleset): number {
  return statValue(xpNow, ruleset) - statValue(xpAtMidnight, ruleset);
}

export interface NeglectState {
  /** Local days since this stat last received stat XP (0 = trained today). */
  daysSinceTrained: number;
  hidden: boolean;
}

/** A visible stat untrained for `neglectDays` local days shows the Idle tag. */
export function isNeglected(state: NeglectState, ruleset: Ruleset): boolean {
  if (state.hidden) return false;
  return state.daysSinceTrained >= ruleset.stats.neglectDays;
}

/**
 * Decay applied at day close for a stat that has been idle past the neglect
 * window. Returns the stat XP to remove (0 when decay does not apply), as a
 * non-negative amount that the caller clamps so stat XP never goes below 0.
 *
 * "from day 6 each day close removes stat XP equal to one value point" — i.e.
 * one day of neglect beyond the grace window removes enough stat XP to drop
 * `value` by exactly 1 point (never pushing it below 0).
 */
export function neglectDecayAmount(
  state: NeglectState,
  currentStatXp: number,
  ruleset: Ruleset,
): number {
  if (!ruleset.stats.neglectDecay) return 0;
  if (state.hidden) return 0;
  if (state.daysSinceTrained < ruleset.stats.neglectDays) return 0;

  const currentValue = statValue(currentStatXp, ruleset);
  if (currentValue <= 0) return 0;

  // Invert value(xp) = floor(100 * (1 - exp(-xp / scale))) to find the exact
  // xp at which the continuous curve crosses currentValue — the shared
  // boundary between the currentValue and currentValue-1 floor buckets.
  // Flooring that boundary lands one whole XP inside the currentValue-1
  // bucket (the buckets are always wider than 1 XP for any realistic scale),
  // so no iterative search is needed.
  const scale = ruleset.stats.statScale;
  const continuousXpForValue = (v: number) => -scale * Math.log(1 - v / 100);
  const candidate = Math.floor(continuousXpForValue(currentValue));

  // currentStatXp always sits at or above this boundary (that's what makes its
  // floored value equal currentValue), so the difference is never negative.
  return currentStatXp - candidate;
}

export function statWeightsSumTo1(weights: Partial<Record<StatCode, number>>): boolean {
  const sum = Object.values(weights).reduce((acc: number, w) => acc + (w ?? 0), 0);
  return Math.abs(sum - 1) < 1e-6;
}
