/**
 * Spec 5.10 — Titles. Rules are data, evaluated after each confirmed item and
 * at day close. This module provides the deterministic predicates; the
 * historical counters they consume (consecutive days, distinct-day sets,
 * total focus hours, etc.) are maintained by the service layer, which has
 * access to the ledger.
 */
import type { Ruleset } from './ruleset';

export const TITLE_KEYS = [
  'first_light',
  'early_riser',
  'steady_hand',
  'iron_week',
  'night_owl',
  'marathon_mind',
  'polymath',
  'comeback',
] as const;
export type TitleKey = (typeof TITLE_KEYS)[number];

/** first_light: first confirmed log. */
export function qualifiesFirstLight(totalConfirmedLogs: number): boolean {
  return totalConfirmedLogs >= 1;
}

export function isEarlyRiserLog(localHour: number, ruleset: Ruleset): boolean {
  return localHour < ruleset.titles.earlyRiserCutoffHour;
}

/** early_riser: a log before 08:00 on 7 consecutive days. */
export function qualifiesEarlyRiser(consecutiveDaysWithEarlyLog: number, ruleset: Ruleset): boolean {
  return consecutiveDaysWithEarlyLog >= ruleset.titles.earlyRiserConsecutiveDays;
}

/** steady_hand: 20 tasks finished on time or early. */
export function qualifiesSteadyHand(tasksOnTimeOrEarlyCount: number, ruleset: Ruleset): boolean {
  return tasksOnTimeOrEarlyCount >= ruleset.titles.steadyHandTasks;
}

/** iron_week: all dailies done 7 days in a row. */
export function qualifiesIronWeek(consecutiveAllDailiesDoneDays: number, ruleset: Ruleset): boolean {
  return consecutiveAllDailiesDoneDays >= ruleset.titles.ironWeekDays;
}

/** Night Owl window: [nightOwlCutoffHour, nightOwlWindowEndHour) local time. */
export function isNightOwlLog(localHour: number, ruleset: Ruleset): boolean {
  return localHour >= ruleset.titles.nightOwlCutoffHour && localHour < ruleset.titles.nightOwlWindowEndHour;
}

/** night_owl: logs after 01:00 on 5 different days (not necessarily consecutive). */
export function qualifiesNightOwl(distinctDaysWithLateLog: number, ruleset: Ruleset): boolean {
  return distinctDaysWithLateLog >= ruleset.titles.nightOwlDistinctDays;
}

/** marathon_mind: 300 focus hours total. */
export function qualifiesMarathonMind(totalFocusMinutes: number, ruleset: Ruleset): boolean {
  return totalFocusMinutes / 60 >= ruleset.titles.marathonMindHours;
}

/** polymath: skill level 5 in skills under 4 different stats. */
export function qualifiesPolymath(distinctStatsWithQualifyingSkill: number, ruleset: Ruleset): boolean {
  return distinctStatsWithQualifyingSkill >= ruleset.titles.polymathDistinctStats;
}

export function skillQualifiesForPolymath(skillLvl: number, ruleset: Ruleset): boolean {
  return skillLvl >= ruleset.titles.polymathSkillLevel;
}

/** comeback: leave the Penalty Zone. Event-triggered, not threshold-based. */
export function qualifiesComeback(justLeftPenaltyZone: boolean): boolean {
  return justLeftPenaltyZone;
}
