/**
 * Spec 6.5 — time resolution. Resolves `due_text` / `started_text` with
 * chrono-node in the profile timezone and "now"; if an hour from 1 to 11
 * has no am/pm and both readings land in the future within 24h, the result
 * is ambiguous and the UI shows the inline "7:00 AM or 7:00 PM?" choice.
 */
import * as chrono from 'chrono-node';

export interface ResolvedTime {
  /** Null when chrono couldn't parse the text at all — the UI falls back to a date-time picker. */
  date: Date | null;
  ambiguous: boolean;
  /** [AM option, PM option], present only while ambiguous. */
  ambiguousOptions?: [Date, Date];
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** The next time `hour24:minute` occurs at or after `ref` (rolling to the next day if it's already passed). */
function nextOccurrence(hour24: number, minute: number, ref: Date): Date {
  const candidate = new Date(ref);
  candidate.setHours(hour24, minute, 0, 0);
  if (candidate.getTime() <= ref.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

export function resolveTimeText(text: string, refDate: Date): ResolvedTime {
  const results = chrono.parse(text, refDate, { forwardDate: true });
  if (results.length === 0) {
    return { date: null, ambiguous: false };
  }
  const result = results[0]!;
  const hour = result.start.get('hour');
  const meridiemCertain = result.start.isCertain('meridiem');

  if (hour != null && hour >= 1 && hour <= 11 && !meridiemCertain) {
    const minute = result.start.get('minute') ?? 0;
    // Each candidate rolls forward independently from `refDate` (not from
    // chrono's own single, already-forward-rolled guess) — chrono may have
    // pushed its one guess to the next day because the AM reading had
    // already passed, which would otherwise wrongly push the PM candidate
    // a day too, even when "today, PM" is still a perfectly valid future
    // reading.
    const amDate = nextOccurrence(hour, minute, refDate);
    const pmDate = nextOccurrence(hour + 12, minute, refDate);

    const amInWindow = amDate.getTime() - refDate.getTime() <= ONE_DAY_MS;
    const pmInWindow = pmDate.getTime() - refDate.getTime() <= ONE_DAY_MS;

    if (amInWindow && pmInWindow) {
      return { date: null, ambiguous: true, ambiguousOptions: [amDate, pmDate] };
    }
  }

  return { date: result.start.date(), ambiguous: false };
}

/** Formats an ambiguity option as "7:00 AM" for the inline choice (spec 6.5). */
export function formatAmPm(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
