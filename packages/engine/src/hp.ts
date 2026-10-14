/** Spec 5.4 — HP, Penalty Zone, rest days. */
import type { Ruleset } from './ruleset';

export function clampHp(hp: number, ruleset: Ruleset): number {
  return Math.max(0, Math.min(ruleset.hp.max, hp));
}

/** HP <= dangerThreshold shows in danger and sends the "HP low" notification once per day. */
export function isHpDanger(hp: number, ruleset: Ruleset): boolean {
  return hp <= ruleset.hp.dangerThreshold;
}

export interface HpLossResult {
  /** The amount actually applied (<= lossRequested), always >= 0. */
  appliedLoss: number;
  /** The amount that was originally requested, only set when the cap reduced it. */
  cappedFrom: number | null;
}

/**
 * Daily HP-loss cap: total HP loss per local day is capped at
 * `hp.dailyLossCap`. Call this once per loss event in chronological order,
 * passing how much loss has already been applied today so far; the caller
 * (service layer) tracks that running total for the local day.
 */
export function applyHpLossWithDailyCap(
  lossRequested: number,
  lossAlreadyAppliedToday: number,
  ruleset: Ruleset,
): HpLossResult {
  const remainingCapacity = Math.max(0, ruleset.hp.dailyLossCap - lossAlreadyAppliedToday);
  const appliedLoss = Math.min(lossRequested, remainingCapacity);
  return {
    appliedLoss,
    cappedFrom: appliedLoss < lossRequested ? lossRequested : null,
  };
}

/** Failed task (24h past due, still open): -(2 + 2 * difficulty) HP. */
export function failedTaskHpLossMagnitude(difficulty: number, ruleset: Ruleset): number {
  return ruleset.hp.failedTaskBase + ruleset.hp.failedTaskPerDifficulty * difficulty;
}

export interface DayCloseHpInput {
  activeDailiesCount: number;
  dailiesDoneCount: number;
  isShieldDay: boolean;
}

export interface DayCloseHpResult {
  /** Positive = gain, negative = requested loss magnitude (before the daily cap). */
  delta: number;
  kind: 'shield' | 'all_done' | 'some_undone' | 'no_dailies';
}

/**
 * Day close daily-quest contribution, before the daily loss cap is applied:
 * shield days: no change. All active dailies done: +5. Otherwise: -4 per
 * undone daily (subject to the shared daily loss cap via
 * `applyHpLossWithDailyCap`).
 */
export function dayCloseDailyHpDelta(input: DayCloseHpInput, ruleset: Ruleset): DayCloseHpResult {
  if (input.isShieldDay) {
    return { delta: 0, kind: 'shield' };
  }
  if (input.activeDailiesCount === 0) {
    return { delta: 0, kind: 'no_dailies' };
  }
  const undone = input.activeDailiesCount - input.dailiesDoneCount;
  if (undone <= 0) {
    return { delta: ruleset.hp.allDoneGain, kind: 'all_done' };
  }
  return { delta: -(ruleset.hp.dailyUndoneLoss * undone), kind: 'some_undone' };
}

// ---------------------------------------------------------------------------
// Penalty Zone (entered when HP reaches 0)
// ---------------------------------------------------------------------------

export interface RecoveryProgress {
  /** Tasks completed that were already overdue at the moment Penalty Zone began. */
  overdueTasksCompleted: number;
  /** Minutes completed in a single focus session since Penalty Zone began. */
  singleFocusSessionMinutes: number;
}

export function isRecoveryComplete(progress: RecoveryProgress, ruleset: Ruleset): boolean {
  return (
    progress.overdueTasksCompleted >= ruleset.penaltyZone.recoveryTasksNeeded ||
    progress.singleFocusSessionMinutes >= ruleset.penaltyZone.recoveryFocusMinutes
  );
}

/** On success, HP becomes exitHp (30) and Penalty Zone ends. */
export function penaltyZoneExitHp(ruleset: Ruleset): number {
  return ruleset.penaltyZone.exitHp;
}

export function isRecoveryExpired(
  penaltyZoneSinceMs: number,
  nowMs: number,
  ruleset: Ruleset,
): boolean {
  const windowMs = ruleset.penaltyZone.recoveryWindowHours * 60 * 60 * 1000;
  return nowMs - penaltyZoneSinceMs >= windowMs;
}

// ---------------------------------------------------------------------------
// Rest-day shields (2 per calendar month)
// ---------------------------------------------------------------------------

export function canUseShield(shieldsUsedThisMonth: number, ruleset: Ruleset): boolean {
  return shieldsUsedThisMonth < ruleset.shields.perMonth;
}

export function shieldsRemaining(shieldsUsedThisMonth: number, ruleset: Ruleset): number {
  return Math.max(0, ruleset.shields.perMonth - shieldsUsedThisMonth);
}
