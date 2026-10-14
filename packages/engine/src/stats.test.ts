import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import {
  isNeglected,
  neglectDecayAmount,
  statLevel,
  statTodayGain,
  statValue,
  statWeightsSumTo1,
} from './stats';

describe('statValue', () => {
  it('is 0 at 0 XP', () => {
    expect(statValue(0, DEFAULT_RULESET)).toBe(0);
  });

  it('is monotonic non-decreasing as XP grows', () => {
    const xps = [0, 10, 50, 100, 500, 1000, 2000, 5000, 20000];
    let prev = -1;
    for (const xp of xps) {
      const v = statValue(xp, DEFAULT_RULESET);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('caps at 99 no matter how large XP gets', () => {
    expect(statValue(1_000_000, DEFAULT_RULESET)).toBe(99);
    expect(statValue(50_000, DEFAULT_RULESET)).toBeLessThanOrEqual(99);
  });

  it('never returns a negative value for negative input', () => {
    expect(statValue(-100, DEFAULT_RULESET)).toBe(0);
  });
});

describe('statLevel', () => {
  it('floors value/10', () => {
    expect(statLevel(0)).toBe(0);
    expect(statLevel(9)).toBe(0);
    expect(statLevel(10)).toBe(1);
    expect(statLevel(99)).toBe(9);
  });
});

describe('statTodayGain', () => {
  it('is the difference between now and local-midnight value', () => {
    const gain = statTodayGain(2500, 2000, DEFAULT_RULESET);
    expect(gain).toBe(statValue(2500, DEFAULT_RULESET) - statValue(2000, DEFAULT_RULESET));
    expect(gain).toBeGreaterThan(0);
  });

  it('is 0 when no XP was gained today', () => {
    expect(statTodayGain(2000, 2000, DEFAULT_RULESET)).toBe(0);
  });
});

describe('isNeglected', () => {
  it('is false before the neglect window elapses', () => {
    expect(isNeglected({ daysSinceTrained: 4, hidden: false }, DEFAULT_RULESET)).toBe(false);
  });

  it('is true exactly at the neglect window (5 days)', () => {
    expect(isNeglected({ daysSinceTrained: 5, hidden: false }, DEFAULT_RULESET)).toBe(true);
  });

  it('is true well past the neglect window', () => {
    expect(isNeglected({ daysSinceTrained: 30, hidden: false }, DEFAULT_RULESET)).toBe(true);
  });

  it('hidden stats are never neglected', () => {
    expect(isNeglected({ daysSinceTrained: 100, hidden: true }, DEFAULT_RULESET)).toBe(false);
  });
});

describe('neglectDecayAmount', () => {
  it('is 0 before day 5 (not yet neglected)', () => {
    expect(neglectDecayAmount({ daysSinceTrained: 4, hidden: false }, 2000, DEFAULT_RULESET)).toBe(0);
  });

  it('only applies starting day 6 (daysSinceTrained >= neglectDays)', () => {
    const atThreshold = neglectDecayAmount(
      { daysSinceTrained: 5, hidden: false },
      2000,
      DEFAULT_RULESET,
    );
    expect(atThreshold).toBeGreaterThan(0);
  });

  it('removes enough XP to drop value by exactly one point', () => {
    const xp = 2000;
    const before = statValue(xp, DEFAULT_RULESET);
    const amount = neglectDecayAmount({ daysSinceTrained: 6, hidden: false }, xp, DEFAULT_RULESET);
    const after = statValue(xp - amount, DEFAULT_RULESET);
    expect(after).toBe(before - 1);
  });

  it('never drops value below 0', () => {
    const amount = neglectDecayAmount({ daysSinceTrained: 10, hidden: false }, 5, DEFAULT_RULESET);
    expect(amount).toBeLessThanOrEqual(5);
    expect(statValue(5 - amount, DEFAULT_RULESET)).toBeGreaterThanOrEqual(0);
  });

  it('hidden stats never decay', () => {
    expect(neglectDecayAmount({ daysSinceTrained: 50, hidden: true }, 2000, DEFAULT_RULESET)).toBe(0);
  });

  it('respects the neglect_decay ruleset flag', () => {
    const ruleset = { ...DEFAULT_RULESET, stats: { ...DEFAULT_RULESET.stats, neglectDecay: false } };
    expect(neglectDecayAmount({ daysSinceTrained: 10, hidden: false }, 2000, ruleset)).toBe(0);
  });
});

describe('statWeightsSumTo1', () => {
  it('accepts weights summing to 1', () => {
    expect(statWeightsSumTo1({ FOC: 0.7, DIS: 0.3 })).toBe(true);
  });

  it('rejects weights that do not sum to 1', () => {
    expect(statWeightsSumTo1({ FOC: 0.5, DIS: 0.2 })).toBe(false);
  });
});
