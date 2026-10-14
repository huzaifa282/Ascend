/** Spec 5.3 — Levels and ranks. */
import type { Ruleset } from './ruleset';
import { RANKS, type Rank } from './types';

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** xp_needed(level) = roundToNearest50(100 + 126 * level). e.g. level 23 -> 3,000. */
export function xpNeeded(level: number, ruleset: Ruleset): number {
  return roundToNearest(ruleset.levels.base + ruleset.levels.perLevel * level, ruleset.levels.roundTo);
}

export interface LevelState {
  level: number;
  xpIntoLevel: number;
}

export interface LevelUpResult extends LevelState {
  levelsGained: number;
}

/** Carries over excess XP across as many level-ups as the gain covers. */
export function applyXpGain(state: LevelState, xpGained: number, ruleset: Ruleset): LevelUpResult {
  let level = state.level;
  let xpIntoLevel = state.xpIntoLevel + xpGained;
  let levelsGained = 0;
  let iterations = 0;
  while (xpIntoLevel >= xpNeeded(level, ruleset) && iterations < 100_000) {
    xpIntoLevel -= xpNeeded(level, ruleset);
    level += 1;
    levelsGained += 1;
    iterations += 1;
  }
  return { level, xpIntoLevel, levelsGained };
}

/**
 * Ranks by level band: E 1-9, D 10-24, C 25-39, B 40-59, A 60-79, S 80+.
 * Levels below the lowest band (e.g. 0, defensively) fall back to the lowest rank.
 */
export function rankForLevel(level: number, ruleset: Ruleset): Rank {
  for (const rank of RANKS) {
    const [lo, hi] = ruleset.ranks.bands[rank];
    if (level >= lo && level <= hi) return rank;
  }
  return RANKS[0];
}

export function nextRank(rank: Rank): Rank | null {
  const idx = RANKS.indexOf(rank);
  return idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] ?? null : null;
}

export function rankBandStart(rank: Rank, ruleset: Ruleset): number {
  return ruleset.ranks.bands[rank][0];
}

/** The level at which reaching the next band unlocks a rank trial, or null at the top rank. */
export function trialUnlockLevel(currentRank: Rank, ruleset: Ruleset): number | null {
  const next = nextRank(currentRank);
  return next ? rankBandStart(next, ruleset) : null;
}

/**
 * Without passing the trial, level is capped at band_start_of_next_rank + 4.
 * XP keeps banking against `rawLevel`; once the trial passes, the cap lifts
 * and the displayed level jumps to `rawLevel` immediately.
 */
export function cappedLevel(
  rawLevel: number,
  currentRank: Rank,
  trialPassed: boolean,
  ruleset: Ruleset,
): number {
  const unlock = trialUnlockLevel(currentRank, ruleset);
  if (unlock === null || rawLevel < unlock || trialPassed) return rawLevel;
  return Math.min(rawLevel, unlock + ruleset.ranks.levelCapOffset);
}

export interface TrialDayRecord {
  date: string;
  xp: number;
  dailiesDone: boolean;
  /** true = passed, false = failed, null = shield day (paused, neither). */
  passed: boolean | null;
}

/** Trial day passes at >= TRIAL_DAY_XP and every active daily done. Shield days pause. */
export function evaluateTrialDay(
  dayXp: number,
  allDailiesDone: boolean,
  isShieldDay: boolean,
  ruleset: Ruleset,
): boolean | null {
  if (isShieldDay) return null;
  return dayXp >= ruleset.ranks.trialDayXp && allDailiesDone;
}

export interface TrialProgress {
  consecutivePassed: number;
  passed: boolean;
}

/**
 * Replays a trial's day history: a failed day restarts the count from 0
 * (spec: "restarts the trial from day 1 with no HP cost"); shield days are
 * skipped (paused); reaching `trialDays` consecutive passes completes it.
 */
export function trialProgress(days: TrialDayRecord[], ruleset: Ruleset): TrialProgress {
  let consecutivePassed = 0;
  for (const day of days) {
    if (day.passed === null) continue;
    if (day.passed) {
      consecutivePassed += 1;
      if (consecutivePassed >= ruleset.ranks.trialDays) {
        return { consecutivePassed, passed: true };
      }
    } else {
      consecutivePassed = 0;
    }
  }
  return { consecutivePassed, passed: false };
}
