import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import { dailyXpForSize, dayCountsForStreak, nextStreak } from './dailies';

describe('dailyXpForSize', () => {
  it('maps the four sizes to 20/40/60/80', () => {
    expect(dailyXpForSize('small', DEFAULT_RULESET)).toBe(20);
    expect(dailyXpForSize('medium', DEFAULT_RULESET)).toBe(40);
    expect(dailyXpForSize('large', DEFAULT_RULESET)).toBe(60);
    expect(dailyXpForSize('xlarge', DEFAULT_RULESET)).toBe(80);
  });
});

describe('dayCountsForStreak', () => {
  it('counts with at least one daily done, regardless of XP', () => {
    expect(dayCountsForStreak(1, 0, DEFAULT_RULESET)).toBe(true);
  });

  it('counts with 30+ XP even with no dailies done', () => {
    expect(dayCountsForStreak(0, 30, DEFAULT_RULESET)).toBe(true);
    expect(dayCountsForStreak(0, 29, DEFAULT_RULESET)).toBe(false);
  });

  it('does not count with neither condition met', () => {
    expect(dayCountsForStreak(0, 0, DEFAULT_RULESET)).toBe(false);
  });
});

describe('nextStreak', () => {
  it('increments when the day counts', () => {
    expect(nextStreak(5, true, false)).toBe(6);
  });

  it('resets to 0 when the day does not count', () => {
    expect(nextStreak(5, false, false)).toBe(0);
  });

  it('freezes on shield days regardless of whether the day counted', () => {
    expect(nextStreak(5, true, true)).toBe(5);
    expect(nextStreak(5, false, true)).toBe(5);
  });
});
