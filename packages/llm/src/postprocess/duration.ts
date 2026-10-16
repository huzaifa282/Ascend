/**
 * Spec 6.5 — local (no-LLM, no-tokens) parsing of a free-text duration
 * follow-up answer ("How long?"). Handles bare numbers and units ("45",
 * "45m", "1h20", "1.5 hours", "90 mins"), common phrases ("an hour", "half
 * an hour", "an hour and a half"), time ranges via chrono-node ("6-6:40",
 * "from 7am to 8", "worked 2-4pm"), and a single past instant ("since 6pm",
 * "started at 6:10", "an hour ago") measured up to `now`. Returns null for
 * anything it can't confidently read — the caller falls back to asking the
 * model (`extractDurationAnswer`) rather than guessing.
 */
import * as chrono from 'chrono-node';
import { formatAmPm } from './time';

export interface DurationParseResult {
  minutes: number;
  /** Epoch ms, when the answer encoded an actual start time/range — null for a bare number of minutes. */
  startedAt: number | null;
  /** Human label for the confirm card, e.g. "40 MIN" or "40 MIN · 6:00 PM–6:40 PM". */
  label: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/** A "since"/"started at" answer further back than this is probably a misread, not a long session. */
const MAX_SINCE_HOURS = 12;
const MAX_DURATION_MIN = 960;

function parseNumericOrWordMinutes(t: string): number | null {
  // "1h20", "1h 20m", "1 hr 20 min", "2h", "1.5 hours", "1 hour"
  let m = /^(\d+(?:\.\d+)?)\s*h(?:r|rs|our|ours)?\s*(?:(\d+)\s*(?:m(?:in|ins|inute|inutes)?)?)?$/.exec(t);
  if (m) {
    const hours = Number(m[1]);
    const mins = m[2] ? Number(m[2]) : 0;
    return Math.round(hours * 60) + mins;
  }

  if (/^half\s+(?:an\s+)?hour$/.test(t)) return 30;

  // "an hour and a half", "one hour and a half", "2 hours and a half"
  m = /^(an?|one|\d+)\s*hours?\s+and\s+(?:a\s+)?half$/.exec(t);
  if (m) {
    const word = m[1]!;
    const n = /^\d+$/.test(word) ? Number(word) : 1;
    return n * 60 + 30;
  }

  if (/^(?:an?|one)\s+hour$/.test(t)) return 60;

  // bare minutes: "45", "45m", "45 min", "90 mins", "45 minutes"
  m = /^(\d+)\s*(?:m|min|mins|minute|minutes)?$/.exec(t);
  if (m) return Number(m[1]);

  return null;
}

/** A single past instant ("since 6pm", "started at 6:10", "an hour ago") — no `.end`, i.e. not a range. */
function parseInstant(text: string, now: Date): Date | null {
  let results = chrono.parse(text, now, { forwardDate: false });
  let result = results[0];
  // chrono reads "at 6" as a time but not bare "since 6" — rewriting the
  // leading keyword covers the common phrasing without over-generalizing.
  if (!result && /^since\s+/i.test(text)) {
    results = chrono.parse(text.replace(/^since\s+/i, 'at '), now, { forwardDate: false });
    result = results[0];
  }
  if (result && !result.end) return result.start.date();
  return null;
}

function parseRange(text: string, now: Date): { start: Date; end: Date } | null {
  const results = chrono.parse(text, now, { forwardDate: false });
  const result = results[0];
  if (result && result.end) return { start: result.start.date(), end: result.end.date() };
  return null;
}

export function parseDurationAnswer(text: string, now: Date): DurationParseResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const minutes = parseNumericOrWordMinutes(trimmed.toLowerCase());
  if (minutes != null && minutes > 0 && minutes <= MAX_DURATION_MIN) {
    return { minutes, startedAt: null, label: `${minutes} MIN` };
  }

  const range = parseRange(trimmed, now);
  if (range) {
    let { start, end } = range;
    // Logs describe the past — if chrono's nearest reading landed in the
    // future, both ends of the range roll back a day together.
    if (end.getTime() > now.getTime()) {
      start = new Date(start.getTime() - ONE_DAY_MS);
      end = new Date(end.getTime() - ONE_DAY_MS);
    }
    const rangeMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (rangeMinutes > 0 && rangeMinutes <= MAX_DURATION_MIN) {
      return {
        minutes: rangeMinutes,
        startedAt: start.getTime(),
        label: `${rangeMinutes} MIN · ${formatAmPm(start)}–${formatAmPm(end)}`,
      };
    }
    return null;
  }

  const instant = parseInstant(trimmed, now);
  if (instant) {
    const startedAtMs = instant.getTime() > now.getTime() ? instant.getTime() - ONE_DAY_MS : instant.getTime();
    const sinceMinutes = Math.round((now.getTime() - startedAtMs) / 60000);
    if (sinceMinutes > 0 && sinceMinutes <= MAX_SINCE_HOURS * 60) {
      return {
        minutes: sinceMinutes,
        startedAt: startedAtMs,
        label: `${sinceMinutes} MIN · SINCE ${formatAmPm(new Date(startedAtMs))}`,
      };
    }
  }

  return null;
}
