import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET, mergeRuleset } from './ruleset';

describe('mergeRuleset', () => {
  it('returns the default ruleset untouched when there are no overrides', () => {
    expect(mergeRuleset(null)).toBe(DEFAULT_RULESET);
    expect(mergeRuleset(undefined)).toBe(DEFAULT_RULESET);
  });

  it('deep-merges a nested override over the default, leaving siblings intact', () => {
    const merged = mergeRuleset({ stats: { neglectDays: 10 } });
    expect(merged.stats.neglectDays).toBe(10);
    expect(merged.stats.statScale).toBe(DEFAULT_RULESET.stats.statScale);
    expect(merged.stats.neglectDecay).toBe(DEFAULT_RULESET.stats.neglectDecay);
  });

  it('merges overrides across multiple top-level sections at once', () => {
    const merged = mergeRuleset({
      hp: { max: 150 },
      ranks: { trialDays: 5 },
    });
    expect(merged.hp.max).toBe(150);
    expect(merged.hp.dailyLossCap).toBe(DEFAULT_RULESET.hp.dailyLossCap);
    expect(merged.ranks.trialDays).toBe(5);
    expect(merged.ranks.trialDayXp).toBe(DEFAULT_RULESET.ranks.trialDayXp);
  });

  it('replaces array and leaf values wholesale rather than merging them element-wise', () => {
    const merged = mergeRuleset({ timer: { presetsMinutes: [15, 45] } });
    expect(merged.timer.presetsMinutes).toEqual([15, 45]);
  });

  it('does not mutate the default ruleset object', () => {
    const snapshot = JSON.stringify(DEFAULT_RULESET);
    mergeRuleset({ hp: { max: 999 } });
    expect(JSON.stringify(DEFAULT_RULESET)).toBe(snapshot);
  });
});
