import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import {
  isEarlyRiserLog,
  isNightOwlLog,
  qualifiesComeback,
  qualifiesEarlyRiser,
  qualifiesFirstLight,
  qualifiesIronWeek,
  qualifiesMarathonMind,
  qualifiesNightOwl,
  qualifiesPolymath,
  qualifiesSteadyHand,
  skillQualifiesForPolymath,
} from './titles';

describe('first_light', () => {
  it('qualifies on the first confirmed log', () => {
    expect(qualifiesFirstLight(1)).toBe(true);
    expect(qualifiesFirstLight(0)).toBe(false);
  });
});

describe('early_riser', () => {
  it('classifies logs before 08:00', () => {
    expect(isEarlyRiserLog(7, DEFAULT_RULESET)).toBe(true);
    expect(isEarlyRiserLog(8, DEFAULT_RULESET)).toBe(false);
  });

  it('qualifies at 7 consecutive days', () => {
    expect(qualifiesEarlyRiser(7, DEFAULT_RULESET)).toBe(true);
    expect(qualifiesEarlyRiser(6, DEFAULT_RULESET)).toBe(false);
  });
});

describe('steady_hand', () => {
  it('qualifies at 20 on-time-or-early tasks', () => {
    expect(qualifiesSteadyHand(20, DEFAULT_RULESET)).toBe(true);
    expect(qualifiesSteadyHand(19, DEFAULT_RULESET)).toBe(false);
  });
});

describe('iron_week', () => {
  it('qualifies at 7 consecutive all-dailies-done days', () => {
    expect(qualifiesIronWeek(7, DEFAULT_RULESET)).toBe(true);
    expect(qualifiesIronWeek(6, DEFAULT_RULESET)).toBe(false);
  });
});

describe('night_owl', () => {
  it('classifies logs in the [01:00, 05:00) window', () => {
    expect(isNightOwlLog(1, DEFAULT_RULESET)).toBe(true);
    expect(isNightOwlLog(4, DEFAULT_RULESET)).toBe(true);
    expect(isNightOwlLog(0, DEFAULT_RULESET)).toBe(false);
    expect(isNightOwlLog(5, DEFAULT_RULESET)).toBe(false);
    expect(isNightOwlLog(14, DEFAULT_RULESET)).toBe(false);
  });

  it('qualifies at 5 distinct days', () => {
    expect(qualifiesNightOwl(5, DEFAULT_RULESET)).toBe(true);
    expect(qualifiesNightOwl(4, DEFAULT_RULESET)).toBe(false);
  });
});

describe('marathon_mind', () => {
  it('qualifies at 300 focus hours total', () => {
    expect(qualifiesMarathonMind(300 * 60, DEFAULT_RULESET)).toBe(true);
    expect(qualifiesMarathonMind(300 * 60 - 1, DEFAULT_RULESET)).toBe(false);
  });
});

describe('polymath', () => {
  it('a skill qualifies at level 5+', () => {
    expect(skillQualifiesForPolymath(5, DEFAULT_RULESET)).toBe(true);
    expect(skillQualifiesForPolymath(4, DEFAULT_RULESET)).toBe(false);
  });

  it('qualifies at 4 distinct stats with a qualifying skill', () => {
    expect(qualifiesPolymath(4, DEFAULT_RULESET)).toBe(true);
    expect(qualifiesPolymath(3, DEFAULT_RULESET)).toBe(false);
  });
});

describe('comeback', () => {
  it('qualifies exactly on leaving the Penalty Zone', () => {
    expect(qualifiesComeback(true)).toBe(true);
    expect(qualifiesComeback(false)).toBe(false);
  });
});
