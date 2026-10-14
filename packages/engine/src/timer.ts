/** Spec 5.7 — Focus timer. */
import type { Ruleset } from './ruleset';
import type { StatWeights } from './types';

export function isPresetMinutes(minutes: number, ruleset: Ruleset): boolean {
  return ruleset.timer.presetsMinutes.includes(minutes);
}

export function isValidCustomMinutes(minutes: number, ruleset: Ruleset): boolean {
  return minutes >= ruleset.timer.customMinMinutes && minutes <= ruleset.timer.customMaxMinutes;
}

export function isValidBreakMinutes(minutes: number, ruleset: Ruleset): boolean {
  return ruleset.timer.breaksMinutes.includes(minutes);
}

export type SessionEndReason = 'completed' | 'stopped';

/**
 * On session end: completed sessions are always credited; stopped
 * (early-ended) sessions are credited only once at least
 * `minCreditMinutes` of focused time (pauses excluded) was logged.
 */
export function shouldCreditSession(
  focusedMinutes: number,
  endReason: SessionEndReason,
  ruleset: Ruleset,
): boolean {
  if (endReason === 'completed') return true;
  return focusedMinutes >= ruleset.timer.minCreditMinutes;
}

/** A pause longer than this many minutes ends the session (crediting what was done). */
export function doesPauseEndSession(pauseDurationMinutes: number, ruleset: Ruleset): boolean {
  return pauseDurationMinutes > ruleset.timer.pauseEndsSessionAfterMinutes;
}

/** Stat weights come from the linked task/daily/skill, else the timer default (FOC 0.7, DIS 0.3). */
export function sessionStatWeights(linkedWeights: StatWeights | null, ruleset: Ruleset): StatWeights {
  return linkedWeights ?? ruleset.timer.defaultStatWeights;
}

/** The credited activity's intensity is always moderate. */
export const FOCUS_SESSION_INTENSITY = 'moderate' as const;
