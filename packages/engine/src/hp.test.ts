import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import {
  applyHpLossWithDailyCap,
  canUseShield,
  clampHp,
  dayCloseDailyHpDelta,
  failedTaskHpLossMagnitude,
  isHpDanger,
  isRecoveryComplete,
  isRecoveryExpired,
  penaltyZoneExitHp,
  shieldsRemaining,
} from './hp';

describe('clampHp', () => {
  it('clamps between 0 and max', () => {
    expect(clampHp(-10, DEFAULT_RULESET)).toBe(0);
    expect(clampHp(150, DEFAULT_RULESET)).toBe(100);
    expect(clampHp(55, DEFAULT_RULESET)).toBe(55);
  });
});

describe('isHpDanger', () => {
  it('is true at and below 30', () => {
    expect(isHpDanger(30, DEFAULT_RULESET)).toBe(true);
    expect(isHpDanger(31, DEFAULT_RULESET)).toBe(false);
    expect(isHpDanger(0, DEFAULT_RULESET)).toBe(true);
  });
});

describe('applyHpLossWithDailyCap', () => {
  it('applies the loss in full when under the cap', () => {
    const r = applyHpLossWithDailyCap(8, 0, DEFAULT_RULESET);
    expect(r).toEqual({ appliedLoss: 8, cappedFrom: null });
  });

  it('reduces the loss at the cap boundary: -12 became -4 when 16 already applied', () => {
    const r = applyHpLossWithDailyCap(12, 16, DEFAULT_RULESET);
    expect(r.appliedLoss).toBe(4);
    expect(r.cappedFrom).toBe(12);
  });

  it('applies zero once the cap is already exhausted', () => {
    const r = applyHpLossWithDailyCap(10, 20, DEFAULT_RULESET);
    expect(r.appliedLoss).toBe(0);
    expect(r.cappedFrom).toBe(10);
  });

  it('applies exactly the cap when the loss exactly fills remaining capacity', () => {
    const r = applyHpLossWithDailyCap(4, 16, DEFAULT_RULESET);
    expect(r.appliedLoss).toBe(4);
    expect(r.cappedFrom).toBeNull();
  });
});

describe('failedTaskHpLossMagnitude', () => {
  it('matches -(2 + 2*difficulty) for every difficulty', () => {
    expect(failedTaskHpLossMagnitude(1, DEFAULT_RULESET)).toBe(4);
    expect(failedTaskHpLossMagnitude(3, DEFAULT_RULESET)).toBe(8);
    expect(failedTaskHpLossMagnitude(5, DEFAULT_RULESET)).toBe(12);
  });
});

describe('dayCloseDailyHpDelta', () => {
  it('skips entirely on shield days', () => {
    const r = dayCloseDailyHpDelta(
      { activeDailiesCount: 3, dailiesDoneCount: 0, isShieldDay: true },
      DEFAULT_RULESET,
    );
    expect(r).toEqual({ delta: 0, kind: 'shield' });
  });

  it('gains +5 when all active dailies are done', () => {
    const r = dayCloseDailyHpDelta(
      { activeDailiesCount: 4, dailiesDoneCount: 4, isShieldDay: false },
      DEFAULT_RULESET,
    );
    expect(r).toEqual({ delta: 5, kind: 'all_done' });
  });

  it('loses 4 per undone daily', () => {
    const r = dayCloseDailyHpDelta(
      { activeDailiesCount: 4, dailiesDoneCount: 1, isShieldDay: false },
      DEFAULT_RULESET,
    );
    expect(r).toEqual({ delta: -12, kind: 'some_undone' });
  });

  it('is a no-op with zero active dailies', () => {
    const r = dayCloseDailyHpDelta(
      { activeDailiesCount: 0, dailiesDoneCount: 0, isShieldDay: false },
      DEFAULT_RULESET,
    );
    expect(r).toEqual({ delta: 0, kind: 'no_dailies' });
  });
});

describe('Penalty Zone entry, recovery and exit', () => {
  it('recovery completes via 3 cleared overdue tasks', () => {
    expect(
      isRecoveryComplete({ overdueTasksCompleted: 3, singleFocusSessionMinutes: 0 }, DEFAULT_RULESET),
    ).toBe(true);
    expect(
      isRecoveryComplete({ overdueTasksCompleted: 2, singleFocusSessionMinutes: 0 }, DEFAULT_RULESET),
    ).toBe(false);
  });

  it('recovery completes via a 60-minute focus session', () => {
    expect(
      isRecoveryComplete({ overdueTasksCompleted: 0, singleFocusSessionMinutes: 60 }, DEFAULT_RULESET),
    ).toBe(true);
    expect(
      isRecoveryComplete({ overdueTasksCompleted: 0, singleFocusSessionMinutes: 59 }, DEFAULT_RULESET),
    ).toBe(false);
  });

  it('exits Penalty Zone at HP 30', () => {
    expect(penaltyZoneExitHp(DEFAULT_RULESET)).toBe(30);
  });

  it('expires 24h after entry', () => {
    const since = 0;
    const justUnder = 24 * 60 * 60 * 1000 - 1;
    const atWindow = 24 * 60 * 60 * 1000;
    expect(isRecoveryExpired(since, justUnder, DEFAULT_RULESET)).toBe(false);
    expect(isRecoveryExpired(since, atWindow, DEFAULT_RULESET)).toBe(true);
  });
});

describe('Rest-day shields', () => {
  it('allows up to 2 per month', () => {
    expect(canUseShield(0, DEFAULT_RULESET)).toBe(true);
    expect(canUseShield(1, DEFAULT_RULESET)).toBe(true);
    expect(canUseShield(2, DEFAULT_RULESET)).toBe(false);
  });

  it('reports remaining shields', () => {
    expect(shieldsRemaining(0, DEFAULT_RULESET)).toBe(2);
    expect(shieldsRemaining(1, DEFAULT_RULESET)).toBe(1);
    expect(shieldsRemaining(2, DEFAULT_RULESET)).toBe(0);
  });
});
