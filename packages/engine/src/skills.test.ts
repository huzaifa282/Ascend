import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import {
  isSuggestionSuppressed,
  shouldSuggestSkill,
  skillLevel,
  suggestionWindowMs,
} from './skills';

describe('skillLevel', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(skillLevel(0, DEFAULT_RULESET)).toBe(1);
  });

  it('matches floor(sqrt(xp/50)) + 1', () => {
    expect(skillLevel(50, DEFAULT_RULESET)).toBe(2);
    expect(skillLevel(200, DEFAULT_RULESET)).toBe(3);
    expect(skillLevel(450, DEFAULT_RULESET)).toBe(4);
  });

  it('is monotonic non-decreasing', () => {
    let prev = 0;
    for (const xp of [0, 10, 50, 100, 500, 2000]) {
      const lvl = skillLevel(xp, DEFAULT_RULESET);
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });
});

describe('shouldSuggestSkill', () => {
  it('suggests at 5+ occurrences', () => {
    expect(shouldSuggestSkill(5, DEFAULT_RULESET)).toBe(true);
    expect(shouldSuggestSkill(4, DEFAULT_RULESET)).toBe(false);
  });
});

describe('suggestionWindowMs', () => {
  it('converts the 21-day suggestion window to milliseconds', () => {
    expect(suggestionWindowMs(DEFAULT_RULESET)).toBe(21 * 24 * 60 * 60 * 1000);
  });
});

describe('isSuggestionSuppressed', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('suppresses for 60 days after a dismissal', () => {
    expect(isSuggestionSuppressed(0, 59 * DAY, DEFAULT_RULESET)).toBe(true);
    expect(isSuggestionSuppressed(0, 60 * DAY, DEFAULT_RULESET)).toBe(false);
  });
});
