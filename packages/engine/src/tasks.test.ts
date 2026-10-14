import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import {
  ambitionLabel,
  baseReward,
  computeAmbition,
  emergencyQuestReward,
  evaluateTaskCompletion,
  gracePercentNow,
  rescheduleMultiplier,
  taskBaseAmount,
  taskEstDefaultMinutes,
  windowStartAfterReschedule,
} from './tasks';

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

describe('taskBaseAmount / taskEstDefaultMinutes', () => {
  it('matches the BASE and EST_DEFAULT tables for every difficulty', () => {
    expect(taskBaseAmount(1, DEFAULT_RULESET)).toBe(20);
    expect(taskBaseAmount(5, DEFAULT_RULESET)).toBe(160);
    expect(taskEstDefaultMinutes(1, DEFAULT_RULESET)).toBe(15);
    expect(taskEstDefaultMinutes(5, DEFAULT_RULESET)).toBe(240);
  });
});

describe('computeAmbition', () => {
  it('clamps pressure between 0.02 and 1', () => {
    expect(computeAmbition(1, 100_000, DEFAULT_RULESET).pressure).toBe(0.02);
    expect(computeAmbition(1000, 10, DEFAULT_RULESET).pressure).toBe(1);
  });

  it('computes ambition = 0.8 + 0.7*sqrt(pressure)', () => {
    const { pressure, ambition } = computeAmbition(60, 120, DEFAULT_RULESET); // pressure 0.5
    expect(pressure).toBe(0.5);
    expect(ambition).toBeCloseTo(0.8 + 0.7 * Math.sqrt(0.5), 6);
  });

  it('ranges from 0.9 to 1.5 across the clamp bounds', () => {
    const low = computeAmbition(1, 1_000_000, DEFAULT_RULESET).ambition;
    const high = computeAmbition(1000, 10, DEFAULT_RULESET).ambition;
    expect(low).toBeCloseTo(0.8 + 0.7 * Math.sqrt(0.02), 6);
    expect(high).toBe(1.5);
  });
});

describe('ambitionLabel', () => {
  it('labels High risk, high reward at ambition >= 1.3 and difficulty >= 4', () => {
    expect(ambitionLabel(1.3, 4, DEFAULT_RULESET)).toBe('high_risk');
    expect(ambitionLabel(1.3, 3, DEFAULT_RULESET)).toBeNull();
    expect(ambitionLabel(1.29, 5, DEFAULT_RULESET)).toBeNull();
  });

  it('labels Low reward at ambition <= 0.95 and difficulty <= 2', () => {
    expect(ambitionLabel(0.95, 2, DEFAULT_RULESET)).toBe('low_reward');
    expect(ambitionLabel(0.95, 3, DEFAULT_RULESET)).toBeNull();
    expect(ambitionLabel(0.96, 1, DEFAULT_RULESET)).toBeNull();
  });
});

describe('baseReward', () => {
  it('rounds BASE[difficulty] * ambition', () => {
    expect(baseReward(3, 1.2, DEFAULT_RULESET)).toBe(Math.round(70 * 1.2));
  });
});

describe('evaluateTaskCompletion tiers', () => {
  const windowStart = 0;
  const dueAt = 10 * HOUR; // 600 minute window
  const base = 100;

  function completeAt(ms: number) {
    return evaluateTaskCompletion(
      { dueAtMs: dueAt, completedAtMs: ms, windowStartMs: windowStart, baseRewardAmount: base },
      DEFAULT_RULESET,
    );
  }

  it('Early: r >= 0.5 -> x1.25', () => {
    // halfway through the window remaining => r = 0.5
    const r = completeAt(dueAt - 0.5 * 600 * MIN);
    expect(r.tier).toBe('early');
    expect(r.multiplier).toBe(1.25);
    expect(r.xp).toBe(125);
  });

  it('Early (scaled): 0.1 <= r < 0.5', () => {
    const r = completeAt(dueAt - 0.3 * 600 * MIN); // r = 0.3
    expect(r.tier).toBe('early_scaled');
    expect(r.multiplier).toBeCloseTo(1.1 + 0.15 * ((0.3 - 0.1) / 0.4), 6);
  });

  it('early_scaled is continuous with early at r=0.5', () => {
    const justBelow = completeAt(dueAt - 0.499999 * 600 * MIN);
    expect(justBelow.multiplier).toBeCloseTo(1.25, 2);
  });

  it('On time: 0 <= r < 0.1 -> x1.10', () => {
    const atDue = completeAt(dueAt);
    expect(atDue.tier).toBe('on_time');
    expect(atDue.multiplier).toBe(1.1);

    const r = completeAt(dueAt - 0.05 * 600 * MIN);
    expect(r.tier).toBe('on_time');
    expect(r.multiplier).toBe(1.1);
  });

  it('Grace: minimum grace length is 15 minutes even for a tiny window', () => {
    const tinyDue = 20 * MIN; // window 20 min; 0.25*20 = 5 < 15 min floor
    const lateBy10 = evaluateTaskCompletion(
      { dueAtMs: tinyDue, completedAtMs: tinyDue + 10 * MIN, windowStartMs: 0, baseRewardAmount: base },
      DEFAULT_RULESET,
    );
    expect(lateBy10.tier).toBe('grace');
    expect(lateBy10.multiplier).toBeCloseTo(1 - 0.5 * (10 / 15), 6);
  });

  it('Grace: maximum grace length is 120 minutes even for a huge window', () => {
    const hugeDue = 1000 * HOUR; // 0.25 * window way over 120 min cap
    const lateBy100 = evaluateTaskCompletion(
      { dueAtMs: hugeDue, completedAtMs: hugeDue + 100 * MIN, windowStartMs: 0, baseRewardAmount: base },
      DEFAULT_RULESET,
    );
    expect(lateBy100.tier).toBe('grace');
    expect(lateBy100.multiplier).toBeCloseTo(1 - 0.5 * (100 / 120), 6);
  });

  it('Grace multiplier runs from just under 100% down to exactly 50%', () => {
    const graceLen = 120; // from the huge-window case above, capped at 120
    const dueHuge = 1000 * HOUR;
    const atGraceEnd = evaluateTaskCompletion(
      { dueAtMs: dueHuge, completedAtMs: dueHuge + graceLen * MIN, windowStartMs: 0, baseRewardAmount: base },
      DEFAULT_RULESET,
    );
    expect(atGraceEnd.tier).toBe('grace');
    expect(atGraceEnd.multiplier).toBeCloseTo(0.5, 6);
  });

  it('Late: after grace, up to due+24h -> x0.30', () => {
    const r = completeAt(dueAt + 3 * HOUR);
    expect(r.tier).toBe('late');
    expect(r.multiplier).toBe(0.3);
  });

  it('Late tier extends up to exactly due+24h', () => {
    const r = completeAt(dueAt + 24 * HOUR);
    expect(r.tier).toBe('late');
  });

  it('Failed: still open past due+24h -> 0 XP', () => {
    const r = completeAt(dueAt + 24 * HOUR + MIN);
    expect(r.tier).toBe('failed');
    expect(r.xp).toBe(0);
  });
});

describe('gracePercentNow', () => {
  it('reports 100% at the start of grace and 50% at its end', () => {
    expect(gracePercentNow(0, 600, DEFAULT_RULESET)).toBe(100);
    const graceLen = 120; // 0.25*600 = 150, clamped to the 120 max
    expect(gracePercentNow(graceLen, 600, DEFAULT_RULESET)).toBe(50);
  });

  it('clamps at 0% once fully past the grace window', () => {
    expect(gracePercentNow(99999, 600, DEFAULT_RULESET)).toBe(0);
  });
});

describe('emergencyQuestReward', () => {
  it('matches the fixed emergency quest reward', () => {
    expect(emergencyQuestReward(DEFAULT_RULESET)).toEqual({ xp: 120, hp: 10, expireHours: 4 });
  });
});

describe('rescheduleMultiplier', () => {
  it('the first reschedule is free', () => {
    expect(rescheduleMultiplier(1, DEFAULT_RULESET)).toBe(1);
  });

  it('each later reschedule compounds 0.95', () => {
    expect(rescheduleMultiplier(2, DEFAULT_RULESET)).toBeCloseTo(0.95, 6);
    expect(rescheduleMultiplier(3, DEFAULT_RULESET)).toBeCloseTo(0.95 * 0.95, 6);
  });

  it('floors at 0.70 no matter how many reschedules', () => {
    expect(rescheduleMultiplier(50, DEFAULT_RULESET)).toBe(0.7);
  });
});

describe('windowStartAfterReschedule', () => {
  it('resets window_start to now when the new due date is later', () => {
    const now = 5000;
    expect(windowStartAfterReschedule(0, 1000, 2000, now)).toBe(now);
  });

  it('keeps the old window_start when the new due date is earlier or the same', () => {
    expect(windowStartAfterReschedule(0, 2000, 1000, 5000)).toBe(0);
    expect(windowStartAfterReschedule(0, 2000, 2000, 5000)).toBe(0);
  });
});
