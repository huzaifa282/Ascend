import { describe, expect, it } from 'vitest';
import { parseDurationAnswer } from './duration';

const ref = new Date(2026, 9, 16, 19, 0, 0); // Fri Oct 16 2026, 19:00 local

describe('parseDurationAnswer', () => {
  it('reads bare numbers and minute units', () => {
    expect(parseDurationAnswer('45', ref)?.minutes).toBe(45);
    expect(parseDurationAnswer('45m', ref)?.minutes).toBe(45);
    expect(parseDurationAnswer('45 min', ref)?.minutes).toBe(45);
    expect(parseDurationAnswer('90 mins', ref)?.minutes).toBe(90);
    expect(parseDurationAnswer('45 minutes', ref)?.minutes).toBe(45);
  });

  it('reads hour+minute compounds', () => {
    expect(parseDurationAnswer('1h20', ref)?.minutes).toBe(80);
    expect(parseDurationAnswer('1h 20m', ref)?.minutes).toBe(80);
    expect(parseDurationAnswer('1 hr 20 min', ref)?.minutes).toBe(80);
    expect(parseDurationAnswer('2h', ref)?.minutes).toBe(120);
    expect(parseDurationAnswer('1.5 hours', ref)?.minutes).toBe(90);
  });

  it('reads worded hour phrases', () => {
    expect(parseDurationAnswer('an hour', ref)?.minutes).toBe(60);
    expect(parseDurationAnswer('one hour', ref)?.minutes).toBe(60);
    expect(parseDurationAnswer('half an hour', ref)?.minutes).toBe(30);
    expect(parseDurationAnswer('an hour and a half', ref)?.minutes).toBe(90);
    expect(parseDurationAnswer('2 hours and a half', ref)?.minutes).toBe(150);
  });

  it('reads a time range and returns the elapsed minutes plus a start time', () => {
    const r = parseDurationAnswer('6-6:40', ref);
    expect(r?.minutes).toBe(40);
    expect(r?.startedAt).not.toBeNull();
    expect(r?.label).toContain('40 MIN');

    expect(parseDurationAnswer('from 7am to 8', ref)?.minutes).toBe(60);
    expect(parseDurationAnswer('worked 2-4pm', ref)?.minutes).toBe(120);
    expect(parseDurationAnswer('6:00-6:40pm', ref)?.minutes).toBe(40);
  });

  it('reads a single past instant as elapsed-until-now', () => {
    const r = parseDurationAnswer('since 6pm', ref); // ref is 19:00 (7pm)
    expect(r?.minutes).toBe(60);
    expect(r?.startedAt).not.toBeNull();

    expect(parseDurationAnswer('an hour ago', ref)?.minutes).toBe(60);
  });

  it('rejects a since/instant reading further back than 12 hours', () => {
    const farRef = new Date(2026, 9, 16, 8, 0, 0); // 08:00 — "since 6pm" would be ~14h back
    expect(parseDurationAnswer('since 6pm', farRef)).toBeNull();
  });

  it('rejects durations of zero or over the 960-minute ceiling', () => {
    expect(parseDurationAnswer('0', ref)).toBeNull();
    expect(parseDurationAnswer('9999', ref)).toBeNull();
  });

  it('returns null for empty or unreadable text, so the caller can fall back to the model', () => {
    expect(parseDurationAnswer('', ref)).toBeNull();
    expect(parseDurationAnswer('   ', ref)).toBeNull();
    expect(parseDurationAnswer('most of the morning', ref)).toBeNull();
    expect(parseDurationAnswer('a good while', ref)).toBeNull();
  });
});
