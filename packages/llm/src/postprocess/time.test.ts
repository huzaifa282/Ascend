import { describe, expect, it } from 'vitest';
import { formatAmPm, resolveTimeText } from './time';

describe('resolveTimeText', () => {
  it('resolves an unambiguous phrase with an explicit meridiem', () => {
    const ref = new Date(2026, 9, 14, 8, 0, 0); // Wed Oct 14 2026, 08:00
    const result = resolveTimeText('7am tomorrow', ref);
    expect(result.ambiguous).toBe(false);
    expect(result.date).not.toBeNull();
    expect(result.date?.getHours()).toBe(7);
  });

  it('flags a bare hour in 1-11 as ambiguous when both AM and PM fall within 24h', () => {
    const ref = new Date(2026, 9, 14, 8, 0, 0); // 08:00
    const result = resolveTimeText('call the dentist at 7', ref);
    expect(result.ambiguous).toBe(true);
    expect(result.ambiguousOptions).toHaveLength(2);
    const [am, pm] = result.ambiguousOptions!;
    expect(am.getHours()).toBe(7);
    expect(pm.getHours()).toBe(19);
  });

  it('is never ambiguous once the meridiem is stated explicitly', () => {
    const ref = new Date(2026, 9, 14, 20, 0, 0); // 20:00
    const result = resolveTimeText('at 7pm', ref);
    expect(result.ambiguous).toBe(false);
    expect(result.date?.getHours()).toBe(19);
  });

  it('is not ambiguous for an hour outside 1-11 (e.g. noon or midnight)', () => {
    const ref = new Date(2026, 9, 14, 8, 0, 0);
    const result = resolveTimeText('at noon', ref);
    expect(result.ambiguous).toBe(false);
  });

  it('returns null when chrono cannot parse the text', () => {
    const ref = new Date(2026, 9, 14, 8, 0, 0);
    const result = resolveTimeText('asdkjasdkj', ref);
    expect(result.date).toBeNull();
    expect(result.ambiguous).toBe(false);
  });
});

describe('formatAmPm', () => {
  it('formats a time as "7:00 AM" style', () => {
    const d = new Date(2026, 9, 14, 7, 0, 0);
    expect(formatAmPm(d)).toBe('7:00 AM');
  });

  it('formats a PM time correctly', () => {
    const d = new Date(2026, 9, 14, 19, 30, 0);
    expect(formatAmPm(d)).toBe('7:30 PM');
  });
});
