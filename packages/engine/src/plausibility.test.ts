import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET } from './ruleset';
import { checkPlausibility, classifyActivity, speedKmh } from './plausibility';

const base = {
  activityClass: 'running',
  durationMin: 30,
  distanceKm: null as number | null,
  pages: null as number | null,
  xp: 30,
  totalLoggedTodayMinutes: 30,
};

describe('classifyActivity', () => {
  it('classifies common free-text labels', () => {
    expect(classifyActivity('Morning run')).toBe('running');
    expect(classifyActivity('evening walk')).toBe('walking');
    expect(classifyActivity('cycling to work')).toBe('cycling');
    expect(classifyActivity('pool swim')).toBe('swimming');
    expect(classifyActivity('reading a novel')).toBe('reading');
    expect(classifyActivity('deep work')).toBe('other');
  });
});

describe('speedKmh', () => {
  it('computes distance over time in hours', () => {
    expect(speedKmh(10, 60)).toBe(10);
    expect(speedKmh(5, 30)).toBe(10);
  });

  it('is null for zero duration', () => {
    expect(speedKmh(5, 0)).toBeNull();
  });
});

describe('checkPlausibility', () => {
  it('flags running faster than 25 km/h', () => {
    const r = checkPlausibility({ ...base, distanceKm: 15, durationMin: 30 }, DEFAULT_RULESET); // 30 km/h
    expect(r.flagged).toBe(true);
    expect(r.reasons[0]).toContain('km/h');
  });

  it('flags running slower than 3 km/h with a distance given', () => {
    const r = checkPlausibility({ ...base, distanceKm: 1, durationMin: 60 }, DEFAULT_RULESET); // 1 km/h
    expect(r.flagged).toBe(true);
  });

  it('does not flag plausible running', () => {
    const r = checkPlausibility({ ...base, distanceKm: 5, durationMin: 30 }, DEFAULT_RULESET); // 10 km/h
    expect(r.flagged).toBe(false);
  });

  it('flags walking faster than 8 km/h', () => {
    const r = checkPlausibility(
      { ...base, activityClass: 'walking', distanceKm: 6, durationMin: 30 },
      DEFAULT_RULESET,
    ); // 12 km/h
    expect(r.flagged).toBe(true);
  });

  it('flags cycling faster than 60 km/h', () => {
    const r = checkPlausibility(
      { ...base, activityClass: 'cycling', distanceKm: 40, durationMin: 30 },
      DEFAULT_RULESET,
    ); // 80 km/h
    expect(r.flagged).toBe(true);
  });

  it('flags swimming faster than 6 km/h', () => {
    const r = checkPlausibility(
      { ...base, activityClass: 'swimming', distanceKm: 4, durationMin: 30 },
      DEFAULT_RULESET,
    ); // 8 km/h
    expect(r.flagged).toBe(true);
  });

  it('flags any single activity over 8 hours', () => {
    const r = checkPlausibility({ ...base, durationMin: 8 * 60 + 1 }, DEFAULT_RULESET);
    expect(r.flagged).toBe(true);
  });

  it('flags a daily total over 16 hours', () => {
    const r = checkPlausibility({ ...base, totalLoggedTodayMinutes: 16 * 60 + 1 }, DEFAULT_RULESET);
    expect(r.flagged).toBe(true);
  });

  it('flags zero duration with nonzero XP', () => {
    const r = checkPlausibility({ ...base, durationMin: 0, xp: 10 }, DEFAULT_RULESET);
    expect(r.flagged).toBe(true);
  });

  it('does not flag zero duration with zero XP', () => {
    const r = checkPlausibility({ ...base, durationMin: 0, xp: 0 }, DEFAULT_RULESET);
    expect(r.flagged).toBe(false);
  });

  it('flags reading over 150 pages per hour', () => {
    const r = checkPlausibility(
      { ...base, activityClass: 'reading', pages: 100, durationMin: 30 },
      DEFAULT_RULESET,
    ); // 200 pages/hour
    expect(r.flagged).toBe(true);
  });

  it('does not flag plausible reading', () => {
    const r = checkPlausibility(
      { ...base, activityClass: 'reading', pages: 20, durationMin: 30 },
      DEFAULT_RULESET,
    ); // 40 pages/hour
    expect(r.flagged).toBe(false);
  });

  it('returns no reasons for an entirely plausible activity', () => {
    const r = checkPlausibility({ ...base, distanceKm: null }, DEFAULT_RULESET);
    expect(r.flagged).toBe(false);
    expect(r.reasons).toEqual([]);
  });
});
