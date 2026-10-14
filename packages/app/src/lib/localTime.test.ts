import { describe, expect, it } from 'vitest';
import {
  addLocalDays,
  daysBetweenLocalDates,
  localDateRange,
  localDateString,
  localDayBounds,
  localHour,
  localMidnightMs,
  localMonthString,
} from './localTime';

describe('localDateString', () => {
  it('reports the local calendar date for a fixed-offset timezone (Asia/Karachi, +5:00)', () => {
    // 2026-01-01T20:00:00Z is 2026-01-02 01:00 in Karachi.
    const ms = Date.UTC(2026, 0, 1, 20, 0, 0);
    expect(localDateString(ms, 'Asia/Karachi')).toBe('2026-01-02');
  });

  it('can differ from the UTC date in either direction', () => {
    const ms = Date.UTC(2026, 0, 1, 1, 0, 0); // 2025-12-31 20:00 in New York (-5:00)
    expect(localDateString(ms, 'America/New_York')).toBe('2025-12-31');
  });
});

describe('localHour', () => {
  it('reports the local hour', () => {
    const ms = Date.UTC(2026, 0, 1, 20, 0, 0); // 01:00 next day in Karachi
    expect(localHour(ms, 'Asia/Karachi')).toBe(1);
  });
});

describe('localMidnightMs / localDayBounds', () => {
  it('round-trips: midnight of a date formats back to that date', () => {
    const midnight = localMidnightMs('2026-03-15', 'Asia/Karachi');
    expect(localDateString(midnight, 'Asia/Karachi')).toBe('2026-03-15');
    expect(localHour(midnight, 'Asia/Karachi')).toBe(0);
  });

  it('produces a 24-hour [start, end) window', () => {
    const bounds = localDayBounds(localMidnightMs('2026-03-15', 'Asia/Karachi') + 12 * 60 * 60 * 1000, 'Asia/Karachi');
    expect(bounds.localDate).toBe('2026-03-15');
    expect(bounds.endMs - bounds.startMs).toBe(24 * 60 * 60 * 1000);
  });

  it('handles a DST-observing timezone without throwing and keeps a 23-25h window', () => {
    const bounds = localDayBounds(Date.UTC(2026, 2, 8, 12, 0, 0), 'America/New_York');
    const hours = (bounds.endMs - bounds.startMs) / (60 * 60 * 1000);
    expect(hours).toBeGreaterThanOrEqual(23);
    expect(hours).toBeLessThanOrEqual(25);
  });
});

describe('addLocalDays', () => {
  it('adds days within a month', () => {
    expect(addLocalDays('2026-03-15', 1)).toBe('2026-03-16');
  });

  it('rolls over months and years', () => {
    expect(addLocalDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addLocalDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('supports negative offsets', () => {
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('localMonthString', () => {
  it('takes the YYYY-MM prefix', () => {
    expect(localMonthString('2026-03-15')).toBe('2026-03');
  });
});

describe('daysBetweenLocalDates', () => {
  it('counts whole calendar days, including across month/year boundaries', () => {
    expect(daysBetweenLocalDates('2026-03-15', '2026-03-15')).toBe(0);
    expect(daysBetweenLocalDates('2026-03-15', '2026-03-20')).toBe(5);
    expect(daysBetweenLocalDates('2026-12-30', '2027-01-02')).toBe(3);
  });

  it('is negative when b is before a', () => {
    expect(daysBetweenLocalDates('2026-03-15', '2026-03-10')).toBe(-5);
  });
});

describe('localDateRange', () => {
  it('lists every date strictly after `from` through `to`', () => {
    expect(localDateRange('2026-03-15', '2026-03-18')).toEqual([
      '2026-03-16',
      '2026-03-17',
      '2026-03-18',
    ]);
  });

  it('is empty when to is not after from', () => {
    expect(localDateRange('2026-03-15', '2026-03-15')).toEqual([]);
    expect(localDateRange('2026-03-15', '2026-03-14')).toEqual([]);
  });
});
