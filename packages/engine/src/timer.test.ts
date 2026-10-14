import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import {
  doesPauseEndSession,
  isPresetMinutes,
  isValidBreakMinutes,
  isValidCustomMinutes,
  sessionStatWeights,
  shouldCreditSession,
} from './timer';

describe('preset and custom validation', () => {
  it('accepts the three presets', () => {
    expect(isPresetMinutes(25, DEFAULT_RULESET)).toBe(true);
    expect(isPresetMinutes(50, DEFAULT_RULESET)).toBe(true);
    expect(isPresetMinutes(90, DEFAULT_RULESET)).toBe(true);
    expect(isPresetMinutes(30, DEFAULT_RULESET)).toBe(false);
  });

  it('accepts custom durations within 5-180', () => {
    expect(isValidCustomMinutes(5, DEFAULT_RULESET)).toBe(true);
    expect(isValidCustomMinutes(180, DEFAULT_RULESET)).toBe(true);
    expect(isValidCustomMinutes(4, DEFAULT_RULESET)).toBe(false);
    expect(isValidCustomMinutes(181, DEFAULT_RULESET)).toBe(false);
  });

  it('accepts the three break lengths', () => {
    expect(isValidBreakMinutes(5, DEFAULT_RULESET)).toBe(true);
    expect(isValidBreakMinutes(10, DEFAULT_RULESET)).toBe(true);
    expect(isValidBreakMinutes(15, DEFAULT_RULESET)).toBe(true);
    expect(isValidBreakMinutes(20, DEFAULT_RULESET)).toBe(false);
  });
});

describe('shouldCreditSession', () => {
  it('always credits a completed session, even under 10 minutes', () => {
    expect(shouldCreditSession(3, 'completed', DEFAULT_RULESET)).toBe(true);
  });

  it('credits a stopped session only at 10+ focused minutes', () => {
    expect(shouldCreditSession(10, 'stopped', DEFAULT_RULESET)).toBe(true);
    expect(shouldCreditSession(9, 'stopped', DEFAULT_RULESET)).toBe(false);
  });
});

describe('doesPauseEndSession', () => {
  it('ends the session once a pause exceeds 10 minutes', () => {
    expect(doesPauseEndSession(11, DEFAULT_RULESET)).toBe(true);
    expect(doesPauseEndSession(10, DEFAULT_RULESET)).toBe(false);
  });
});

describe('sessionStatWeights', () => {
  it('uses the linked weights when present', () => {
    expect(sessionStatWeights({ INT: 1 }, DEFAULT_RULESET)).toEqual({ INT: 1 });
  });

  it('falls back to FOC 0.7 / DIS 0.3 when nothing is linked', () => {
    expect(sessionStatWeights(null, DEFAULT_RULESET)).toEqual({ FOC: 0.7, DIS: 0.3 });
  });
});
