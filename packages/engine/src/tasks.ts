/** Spec 5.5 — Tasks with deadlines and reward tiers. */
import type { Ruleset } from './ruleset';
import type { EpochMs } from './types';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function taskBaseAmount(difficulty: Difficulty, ruleset: Ruleset): number {
  return ruleset.tasks.base[difficulty];
}

export function taskEstDefaultMinutes(difficulty: Difficulty, ruleset: Ruleset): number {
  return ruleset.tasks.estDefaultMinutes[difficulty];
}

export interface AmbitionResult {
  pressure: number;
  ambition: number;
}

/** pressure = clamp(est / window, 0.02, 1); ambition = 0.8 + 0.7 * sqrt(pressure). */
export function computeAmbition(
  estMinutes: number,
  windowMinutes: number,
  ruleset: Ruleset,
): AmbitionResult {
  const pressure = clamp(estMinutes / windowMinutes, ruleset.tasks.pressureMin, ruleset.tasks.pressureMax);
  const ambition = ruleset.tasks.ambitionBase + ruleset.tasks.ambitionScale * Math.sqrt(pressure);
  return { pressure, ambition };
}

export type AmbitionLabel = 'high_risk' | 'low_reward' | null;

export function ambitionLabel(
  ambition: number,
  difficulty: Difficulty,
  ruleset: Ruleset,
): AmbitionLabel {
  if (ambition >= ruleset.tasks.highRiskAmbition && difficulty >= ruleset.tasks.highRiskMinDifficulty) {
    return 'high_risk';
  }
  if (ambition <= ruleset.tasks.lowRewardAmbition && difficulty <= ruleset.tasks.lowRewardMaxDifficulty) {
    return 'low_reward';
  }
  return null;
}

/** base_reward = round(BASE[difficulty] * ambition). */
export function baseReward(difficulty: Difficulty, ambition: number, ruleset: Ruleset): number {
  return Math.round(taskBaseAmount(difficulty, ruleset) * ambition);
}

export type CompletionTier = 'early' | 'early_scaled' | 'on_time' | 'grace' | 'late' | 'failed';

export interface CompletionResult {
  tier: CompletionTier;
  multiplier: number;
  xp: number;
}

export interface TaskCompletionInput {
  dueAtMs: EpochMs;
  completedAtMs: EpochMs;
  windowStartMs: EpochMs;
  baseRewardAmount: number;
}

/**
 * Completion tier by r = remaining-before-due / window (early/on-time) or by
 * minutes late (grace/late/failed). See spec 5.5's tier table.
 */
export function evaluateTaskCompletion(input: TaskCompletionInput, ruleset: Ruleset): CompletionResult {
  const t = ruleset.tasks.tiers;
  const windowMinutes = (input.dueAtMs - input.windowStartMs) / 60_000;

  if (input.completedAtMs <= input.dueAtMs) {
    const remainingMinutes = (input.dueAtMs - input.completedAtMs) / 60_000;
    const r = windowMinutes > 0 ? remainingMinutes / windowMinutes : 0;

    if (r >= t.earlyMinRemaining) {
      return finish('early', t.earlyMultiplier, input.baseRewardAmount);
    }
    if (r >= t.earlyScaledMinRemaining) {
      const multiplier =
        t.earlyScaledBase +
        t.earlyScaledRange * ((r - t.earlyScaledMinRemaining) / (t.earlyMinRemaining - t.earlyScaledMinRemaining));
      return finish('early_scaled', multiplier, input.baseRewardAmount);
    }
    return finish('on_time', t.onTimeMultiplier, input.baseRewardAmount);
  }

  const lateMinutes = (input.completedAtMs - input.dueAtMs) / 60_000;
  const graceLen = clamp(t.graceWindowFraction * windowMinutes, t.graceMinMinutes, t.graceMaxMinutes);

  if (lateMinutes <= graceLen) {
    const multiplier = 1 - 0.5 * (lateMinutes / graceLen);
    return finish('grace', multiplier, input.baseRewardAmount);
  }
  if (lateMinutes <= t.lateWindowHours * 60) {
    return finish('late', t.lateMultiplier, input.baseRewardAmount);
  }
  return finish('failed', 0, input.baseRewardAmount);
}

function finish(tier: CompletionTier, multiplier: number, baseRewardAmount: number): CompletionResult {
  return { tier, multiplier, xp: Math.round(baseRewardAmount * multiplier) };
}

/** Live grace percentage for the UI ("NOW 78%"), independent of the final award. */
export function gracePercentNow(lateMinutesSoFar: number, windowMinutes: number, ruleset: Ruleset): number {
  const t = ruleset.tasks.tiers;
  const graceLen = clamp(t.graceWindowFraction * windowMinutes, t.graceMinMinutes, t.graceMaxMinutes);
  const multiplier = clamp(1 - 0.5 * (lateMinutesSoFar / graceLen), 0, 1);
  return Math.round(multiplier * 100);
}

/**
 * The first reschedule is free; each later one compounds a 0.95 multiplier
 * on the eventual reward, floored at 0.70.
 * `totalRescheduleCount` includes the reschedule being costed (1 = the first).
 */
export function rescheduleMultiplier(totalRescheduleCount: number, ruleset: Ruleset): number {
  if (totalRescheduleCount <= 1) return 1;
  const exponent = totalRescheduleCount - 1;
  const raw = Math.pow(ruleset.tasks.reschedule.laterMultiplier, exponent);
  return Math.max(ruleset.tasks.reschedule.floorMultiplier, raw);
}

/** Rescheduling resets window_start to now only if the new due date is later than the old one. */
export function windowStartAfterReschedule(
  oldWindowStartMs: EpochMs,
  oldDueAtMs: EpochMs,
  newDueAtMs: EpochMs,
  nowMs: EpochMs,
): EpochMs {
  return newDueAtMs > oldDueAtMs ? nowMs : oldWindowStartMs;
}

export function emergencyQuestReward(ruleset: Ruleset): { xp: number; hp: number; expireHours: number } {
  return { ...ruleset.tasks.emergency };
}
