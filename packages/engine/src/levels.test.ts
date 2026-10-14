import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import {
  applyXpGain,
  cappedLevel,
  evaluateTrialDay,
  nextRank,
  rankBandStart,
  rankForLevel,
  trialProgress,
  trialUnlockLevel,
  xpNeeded,
  type TrialDayRecord,
} from './levels';

describe('xpNeeded', () => {
  it('matches the worked example: level 23 -> 3,000', () => {
    expect(xpNeeded(23, DEFAULT_RULESET)).toBe(3000);
  });

  it('rounds to the nearest 50', () => {
    expect(xpNeeded(0, DEFAULT_RULESET)).toBe(100);
    expect(xpNeeded(1, DEFAULT_RULESET)).toBe(roundRef(1));
    expect(xpNeeded(50, DEFAULT_RULESET)).toBe(roundRef(50));
  });
});

function roundRef(level: number): number {
  return Math.round((100 + 126 * level) / 50) * 50;
}

describe('applyXpGain', () => {
  it('carries over excess XP across one level-up', () => {
    const needed = xpNeeded(1, DEFAULT_RULESET);
    const result = applyXpGain({ level: 1, xpIntoLevel: needed - 10 }, 30, DEFAULT_RULESET);
    expect(result.levelsGained).toBe(1);
    expect(result.level).toBe(2);
    expect(result.xpIntoLevel).toBe(20);
  });

  it('carries over excess XP across multiple level-ups in one gain', () => {
    const result = applyXpGain({ level: 1, xpIntoLevel: 0 }, 1_000_000, DEFAULT_RULESET);
    expect(result.levelsGained).toBeGreaterThan(1);
    expect(result.xpIntoLevel).toBeGreaterThanOrEqual(0);
    expect(result.xpIntoLevel).toBeLessThan(xpNeeded(result.level, DEFAULT_RULESET));
  });

  it('does not level up when XP does not reach the threshold', () => {
    const result = applyXpGain({ level: 1, xpIntoLevel: 0 }, 10, DEFAULT_RULESET);
    expect(result.levelsGained).toBe(0);
    expect(result.level).toBe(1);
    expect(result.xpIntoLevel).toBe(10);
  });
});

describe('rankForLevel / rankBandStart / nextRank', () => {
  it('maps every band boundary from spec 5.3', () => {
    expect(rankForLevel(1, DEFAULT_RULESET)).toBe('E');
    expect(rankForLevel(9, DEFAULT_RULESET)).toBe('E');
    expect(rankForLevel(10, DEFAULT_RULESET)).toBe('D');
    expect(rankForLevel(24, DEFAULT_RULESET)).toBe('D');
    expect(rankForLevel(25, DEFAULT_RULESET)).toBe('C');
    expect(rankForLevel(39, DEFAULT_RULESET)).toBe('C');
    expect(rankForLevel(40, DEFAULT_RULESET)).toBe('B');
    expect(rankForLevel(59, DEFAULT_RULESET)).toBe('B');
    expect(rankForLevel(60, DEFAULT_RULESET)).toBe('A');
    expect(rankForLevel(79, DEFAULT_RULESET)).toBe('A');
    expect(rankForLevel(80, DEFAULT_RULESET)).toBe('S');
    expect(rankForLevel(999, DEFAULT_RULESET)).toBe('S');
  });

  it('falls back to the lowest rank for a degenerate level below 1', () => {
    expect(rankForLevel(0, DEFAULT_RULESET)).toBe('E');
  });

  it('nextRank is null past S', () => {
    expect(nextRank('S')).toBeNull();
    expect(nextRank('E')).toBe('D');
  });

  it('rankBandStart matches the table', () => {
    expect(rankBandStart('D', DEFAULT_RULESET)).toBe(10);
    expect(rankBandStart('C', DEFAULT_RULESET)).toBe(25);
  });
});

describe('trialUnlockLevel / cappedLevel', () => {
  it('unlocks at the next band start', () => {
    expect(trialUnlockLevel('D', DEFAULT_RULESET)).toBe(25);
    expect(trialUnlockLevel('S', DEFAULT_RULESET)).toBeNull();
  });

  it('caps level at band_start_of_next_rank + 4 when the trial has not been passed', () => {
    expect(cappedLevel(25, 'D', false, DEFAULT_RULESET)).toBe(25);
    expect(cappedLevel(30, 'D', false, DEFAULT_RULESET)).toBe(29); // 25 + 4
    expect(cappedLevel(100, 'D', false, DEFAULT_RULESET)).toBe(29);
  });

  it('does not cap below the unlock level', () => {
    expect(cappedLevel(24, 'D', false, DEFAULT_RULESET)).toBe(24);
  });

  it('lifts the cap immediately once the trial is passed, banking all XP', () => {
    expect(cappedLevel(35, 'D', true, DEFAULT_RULESET)).toBe(35);
  });

  it('never caps at the top rank', () => {
    expect(cappedLevel(500, 'S', false, DEFAULT_RULESET)).toBe(500);
  });
});

describe('evaluateTrialDay', () => {
  it('passes at exactly the XP threshold with all dailies done', () => {
    expect(evaluateTrialDay(90, true, false, DEFAULT_RULESET)).toBe(true);
  });

  it('fails below the XP threshold', () => {
    expect(evaluateTrialDay(89, true, false, DEFAULT_RULESET)).toBe(false);
  });

  it('fails when dailies are incomplete even with enough XP', () => {
    expect(evaluateTrialDay(200, false, false, DEFAULT_RULESET)).toBe(false);
  });

  it('returns null (pause) on shield days regardless of XP', () => {
    expect(evaluateTrialDay(0, false, true, DEFAULT_RULESET)).toBeNull();
    expect(evaluateTrialDay(500, true, true, DEFAULT_RULESET)).toBeNull();
  });
});

describe('trialProgress', () => {
  const day = (passed: boolean | null): TrialDayRecord => ({
    date: '2026-01-01',
    xp: passed ? 90 : 0,
    dailiesDone: !!passed,
    passed,
  });

  it('passes after 7 consecutive passing days', () => {
    const days = Array.from({ length: 7 }, () => day(true));
    expect(trialProgress(days, DEFAULT_RULESET)).toEqual({ consecutivePassed: 7, passed: true });
  });

  it('restarts the count from day 1 on any failed day', () => {
    const days = [day(true), day(true), day(false), day(true), day(true)];
    expect(trialProgress(days, DEFAULT_RULESET)).toEqual({ consecutivePassed: 2, passed: false });
  });

  it('shield days pause without resetting or advancing progress', () => {
    const days = [day(true), day(true), day(null), day(true), day(true), day(true), day(true), day(true)];
    expect(trialProgress(days, DEFAULT_RULESET)).toEqual({ consecutivePassed: 7, passed: true });
  });

  it('is not passed with fewer than 7 total passing days', () => {
    const days = [day(true), day(true), day(true)];
    expect(trialProgress(days, DEFAULT_RULESET)).toEqual({ consecutivePassed: 3, passed: false });
  });
});
