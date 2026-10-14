/** Spec 5.6 — Daily quests and streak. */
import type { Ruleset } from './ruleset';

export type DailySize = 'small' | 'medium' | 'large' | 'xlarge';

/** Dailies have a fixed XP by size (default 20 / 40 / 60 / 80). */
export function dailyXpForSize(size: DailySize, ruleset: Ruleset): number {
  return ruleset.dailies.xpBySize[size];
}

/** A local day counts toward the streak if >= 1 daily is done or 30+ XP was earned. */
export function dayCountsForStreak(
  dailiesDoneCount: number,
  dayXp: number,
  ruleset: Ruleset,
): boolean {
  return dailiesDoneCount >= 1 || dayXp >= ruleset.dailies.streakMinXp;
}

/**
 * Missing a day resets the streak to 0. Shield days freeze the streak:
 * neither break nor grow it.
 */
export function nextStreak(currentStreak: number, dayCounted: boolean, isShieldDay: boolean): number {
  if (isShieldDay) return currentStreak;
  return dayCounted ? currentStreak + 1 : 0;
}
