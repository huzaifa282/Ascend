import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import { computeActivityXp } from './activityXp';

const base = {
  durationMin: 60,
  intensity: 'moderate' as const,
  statWeights: { END: 1 },
  statXpEarnedTodayByCode: {},
  inPenaltyZone: false,
  plausibility: 'ok' as const,
};

describe('computeActivityXp', () => {
  it('computes raw XP from duration x base rate x intensity', () => {
    const r = computeActivityXp(base, DEFAULT_RULESET);
    expect(r.xpRaw).toBe(60); // 60 * 1.0 * 1.0
    expect(r.xpFinal).toBe(60);
  });

  it('applies intensity multipliers', () => {
    const light = computeActivityXp({ ...base, intensity: 'light' }, DEFAULT_RULESET);
    const hard = computeActivityXp({ ...base, intensity: 'hard' }, DEFAULT_RULESET);
    expect(light.xpRaw).toBe(48); // 60 * 0.8
    expect(hard.xpRaw).toBe(78); // 60 * 1.3
  });

  it('caps duration at 240 minutes', () => {
    const r = computeActivityXp({ ...base, durationMin: 400 }, DEFAULT_RULESET);
    expect(r.xpRaw).toBe(240);
  });

  it('cap boundary: exactly 120 already-earned stat XP is capped', () => {
    const atCap = computeActivityXp(
      { ...base, statXpEarnedTodayByCode: { END: 120 } },
      DEFAULT_RULESET,
    );
    expect(atCap.perStatCapFactor.END).toBe(0.25);
    expect(atCap.wasCapped).toBe(true);
    expect(atCap.xpFinal).toBe(15); // 60 * 0.25

    const justBelow = computeActivityXp(
      { ...base, statXpEarnedTodayByCode: { END: 119 } },
      DEFAULT_RULESET,
    );
    expect(justBelow.perStatCapFactor.END).toBe(1);
    expect(justBelow.wasCapped).toBe(false);
    expect(justBelow.xpFinal).toBe(60);
  });

  it('splits XP across multiple stats by weight, each with its own cap factor', () => {
    const r = computeActivityXp(
      {
        ...base,
        statWeights: { END: 0.6, VIT: 0.4 },
        statXpEarnedTodayByCode: { END: 150, VIT: 0 },
      },
      DEFAULT_RULESET,
    );
    // cap_factor = 0.6*0.25 + 0.4*1 = 0.55
    expect(r.capFactor).toBeCloseTo(0.55, 5);
    expect(r.xpFinal).toBe(Math.round(60 * 0.55));
    expect(r.perStatXp.END).toBe(Math.round(r.xpFinal * 0.6));
    expect(r.perStatXp.VIT).toBe(Math.round(r.xpFinal * 0.4));
    expect(r.cappedStats).toEqual(['END']);
  });

  it('halves XP in the Penalty Zone', () => {
    const normal = computeActivityXp(base, DEFAULT_RULESET);
    const penalized = computeActivityXp({ ...base, inPenaltyZone: true }, DEFAULT_RULESET);
    expect(penalized.xpFinal).toBe(Math.round(normal.xpFinal * 0.5));
  });

  it('reduces XP to 20% while flagged, and restores it once confirmed', () => {
    const flagged = computeActivityXp({ ...base, plausibility: 'flagged' }, DEFAULT_RULESET);
    const confirmed = computeActivityXp({ ...base, plausibility: 'confirmed' }, DEFAULT_RULESET);
    const ok = computeActivityXp({ ...base, plausibility: 'ok' }, DEFAULT_RULESET);
    expect(flagged.xpFinal).toBe(Math.round(60 * 0.2));
    expect(confirmed.xpFinal).toBe(60);
    expect(ok.xpFinal).toBe(60);
  });

  it('combines penalty and plausibility multiplicatively', () => {
    const r = computeActivityXp(
      { ...base, inPenaltyZone: true, plausibility: 'flagged' },
      DEFAULT_RULESET,
    );
    expect(r.xpFinal).toBe(Math.round(60 * 1 * 0.5 * 0.2));
  });
});
