import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import { recalculate } from './recalculate';
import { applyXpGain } from './levels';

describe('recalculate', () => {
  it('sums XP events into total XP, level and xpIntoLevel', () => {
    const result = recalculate(
      {
        xpEvents: [
          { atMs: 1000, amount: 50 },
          { atMs: 2000, amount: 80 },
        ],
        statEvents: [],
      },
      DEFAULT_RULESET,
    );
    expect(result.totalXp).toBe(130);
    expect(result.level).toBeGreaterThanOrEqual(1);
  });

  it('is order-independent (sorts by time before replaying)', () => {
    const a = recalculate(
      {
        xpEvents: [
          { atMs: 2000, amount: 80 },
          { atMs: 1000, amount: 50 },
        ],
        statEvents: [],
      },
      DEFAULT_RULESET,
    );
    const b = recalculate(
      {
        xpEvents: [
          { atMs: 1000, amount: 50 },
          { atMs: 2000, amount: 80 },
        ],
        statEvents: [],
      },
      DEFAULT_RULESET,
    );
    expect(a).toEqual(b);
  });

  it('matches incremental applyXpGain across many events', () => {
    const events = Array.from({ length: 50 }, (_, i) => ({ atMs: i, amount: 37 }));
    const result = recalculate({ xpEvents: events, statEvents: [] }, DEFAULT_RULESET);

    let state = { level: 1, xpIntoLevel: 0 };
    for (const e of events) {
      state = applyXpGain(state, e.amount, DEFAULT_RULESET);
    }
    expect(result.level).toBe(state.level);
    expect(result.xpIntoLevel).toBe(state.xpIntoLevel);
    expect(result.totalXp).toBe(50 * 37);
  });

  it('sums stat events per stat and clamps at 0', () => {
    const result = recalculate(
      {
        xpEvents: [],
        statEvents: [
          { atMs: 1, statCode: 'END', statXp: 100 },
          { atMs: 2, statCode: 'END', statXp: -30 },
          { atMs: 3, statCode: 'INT', statXp: 20 },
          { atMs: 4, statCode: 'END', statXp: -1000 },
        ],
      },
      DEFAULT_RULESET,
    );
    expect(result.statXp.END).toBe(0);
    expect(result.statXp.INT).toBe(20);
  });

  it('derives the raw rank from the replayed level', () => {
    const result = recalculate(
      { xpEvents: [{ atMs: 1, amount: 0 }], statEvents: [] },
      DEFAULT_RULESET,
    );
    expect(result.rawRank).toBe('E');
  });

  it('is deterministic: the same ledger and ruleset always give the same result', () => {
    const ledger = {
      xpEvents: [{ atMs: 1, amount: 500 }, { atMs: 2, amount: 300 }],
      statEvents: [{ atMs: 1, statCode: 'FOC' as const, statXp: 400 }],
    };
    const a = recalculate(ledger, DEFAULT_RULESET);
    const b = recalculate(ledger, DEFAULT_RULESET);
    expect(a).toEqual(b);
  });
});
