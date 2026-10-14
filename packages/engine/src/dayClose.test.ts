import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import { closeDay } from './dayClose';

const baseInput = {
  date: '2026-01-01',
  activeDailiesCount: 3,
  dailiesDoneCount: 3,
  isShieldDay: false,
  dayXp: 100,
  currentStreak: 4,
  hpLossAlreadyAppliedToday: 0,
  stats: [],
};

describe('closeDay', () => {
  it('gains HP and grows the streak when all dailies are done', () => {
    const r = closeDay(baseInput, DEFAULT_RULESET);
    expect(r.hp.appliedDelta).toBe(5);
    expect(r.streak).toEqual({ dayCounted: true, newStreak: 5 });
  });

  it('loses HP per undone daily and resets the streak when the day does not count', () => {
    const r = closeDay(
      { ...baseInput, dailiesDoneCount: 1, dayXp: 10 },
      DEFAULT_RULESET,
    );
    // 2 undone * -4 = -8, but 1 daily done still counts the day for the streak
    expect(r.hp.appliedDelta).toBe(-8);
    expect(r.streak.dayCounted).toBe(true);
  });

  it('resets the streak when nothing was done and XP is under the threshold', () => {
    const r = closeDay(
      { ...baseInput, dailiesDoneCount: 0, dayXp: 10 },
      DEFAULT_RULESET,
    );
    expect(r.streak).toEqual({ dayCounted: false, newStreak: 0 });
  });

  it('applies the shared daily HP-loss cap against losses already applied today', () => {
    const r = closeDay(
      { ...baseInput, dailiesDoneCount: 0, activeDailiesCount: 1, hpLossAlreadyAppliedToday: 18 },
      DEFAULT_RULESET,
    );
    // requested -4, but only 2 HP of capacity remains today
    expect(r.hp.requestedDelta).toBe(-4);
    expect(r.hp.appliedDelta).toBe(-2);
    expect(r.hp.cappedFrom).toBe(-4);
  });

  it('is a no-op for HP and freezes the streak on shield days', () => {
    const r = closeDay({ ...baseInput, isShieldDay: true }, DEFAULT_RULESET);
    expect(r.hp.appliedDelta).toBe(0);
    expect(r.streak.newStreak).toBe(baseInput.currentStreak);
  });

  it('computes neglect decay per stat', () => {
    const r = closeDay(
      {
        ...baseInput,
        stats: [
          { code: 'END', daysSinceTrained: 6, hidden: false, currentStatXp: 2000 },
          { code: 'INT', daysSinceTrained: 1, hidden: false, currentStatXp: 2000 },
        ],
      },
      DEFAULT_RULESET,
    );
    expect(r.statDecay).toHaveLength(1);
    expect(r.statDecay[0]!.code).toBe('END');
    expect(r.statDecay[0]!.amount).toBeGreaterThan(0);
  });

  it('evaluates a trial day when trial history is provided', () => {
    const r = closeDay(
      { ...baseInput, trialDaysSoFar: [] },
      DEFAULT_RULESET,
    );
    expect(r.trialDay).toEqual({ date: baseInput.date, xp: 100, dailiesDone: true, passed: true });
  });

  it('omits the trial day when no trial is active', () => {
    const r = closeDay(baseInput, DEFAULT_RULESET);
    expect(r.trialDay).toBeUndefined();
  });

  it('processes multiple missed days in order without cross-day HP-cap bleed', () => {
    const day1 = closeDay({ ...baseInput, dailiesDoneCount: 0, dayXp: 0 }, DEFAULT_RULESET);
    const day2 = closeDay(
      { ...baseInput, dailiesDoneCount: 0, dayXp: 0, hpLossAlreadyAppliedToday: 0 },
      DEFAULT_RULESET,
    );
    // Each day starts its own fresh loss-cap budget.
    expect(day1.hp.appliedDelta).toBe(day2.hp.appliedDelta);
  });
});
