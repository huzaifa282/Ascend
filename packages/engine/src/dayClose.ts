/**
 * Spec 5.4 — Day close orchestration for a single local day. The service
 * layer calls this once per missed day, in chronological order, when
 * catching up after being closed for more than one day.
 */
import { dayCountsForStreak, nextStreak } from './dailies';
import {
  applyHpLossWithDailyCap,
  dayCloseDailyHpDelta,
  type DayCloseHpResult,
} from './hp';
import { evaluateTrialDay } from './levels';
import { neglectDecayAmount, type NeglectState } from './stats';
import type { Ruleset } from './ruleset';
import type { LocalDate, StatCode } from './types';

export interface DayCloseInput {
  date: LocalDate;
  activeDailiesCount: number;
  dailiesDoneCount: number;
  isShieldDay: boolean;
  dayXp: number;
  currentStreak: number;
  /** HP loss already applied today from other sources (e.g. failed tasks) before day close. */
  hpLossAlreadyAppliedToday: number;
  stats: Array<NeglectState & { code: StatCode; currentStatXp: number }>;
  /** Pass the active trial's day history (without today) to also evaluate the trial day. */
  trialDaysSoFar?: Array<{ date: LocalDate; xp: number; dailiesDone: boolean; passed: boolean | null }>;
}

export interface DayCloseResult {
  hp: {
    requestedDelta: number;
    appliedDelta: number;
    cappedFrom: number | null;
    kind: DayCloseHpResult['kind'];
  };
  streak: {
    dayCounted: boolean;
    newStreak: number;
  };
  statDecay: Array<{ code: StatCode; amount: number }>;
  trialDay?: {
    date: LocalDate;
    xp: number;
    dailiesDone: boolean;
    passed: boolean | null;
  };
}

export function closeDay(input: DayCloseInput, ruleset: Ruleset): DayCloseResult {
  const hpResult = dayCloseDailyHpDelta(
    {
      activeDailiesCount: input.activeDailiesCount,
      dailiesDoneCount: input.dailiesDoneCount,
      isShieldDay: input.isShieldDay,
    },
    ruleset,
  );

  let appliedDelta = hpResult.delta;
  let cappedFrom: number | null = null;
  if (hpResult.delta < 0) {
    const loss = applyHpLossWithDailyCap(-hpResult.delta, input.hpLossAlreadyAppliedToday, ruleset);
    appliedDelta = -loss.appliedLoss;
    cappedFrom = loss.cappedFrom !== null ? -loss.cappedFrom : null;
  }

  const dayCounted = dayCountsForStreak(input.dailiesDoneCount, input.dayXp, ruleset);
  const newStreak = nextStreak(input.currentStreak, dayCounted, input.isShieldDay);

  const statDecay = input.stats
    .map((stat) => ({
      code: stat.code,
      amount: neglectDecayAmount(stat, stat.currentStatXp, ruleset),
    }))
    .filter((d) => d.amount > 0);

  const allDailiesDone =
    input.activeDailiesCount > 0 && input.dailiesDoneCount >= input.activeDailiesCount;
  const trialPassedToday = evaluateTrialDay(input.dayXp, allDailiesDone, input.isShieldDay, ruleset);

  return {
    hp: {
      requestedDelta: hpResult.delta,
      appliedDelta,
      cappedFrom,
      kind: hpResult.kind,
    },
    streak: { dayCounted, newStreak },
    statDecay,
    trialDay: input.trialDaysSoFar
      ? { date: input.date, xp: input.dayXp, dailiesDone: allDailiesDone, passed: trialPassedToday }
      : undefined,
  };
}
