/**
 * IANA-timezone-aware local day helpers, used wherever the spec says "local
 * day" / "local midnight" (section 4: "the profile stores an IANA timezone
 * and the engine works in that local day"). No external date library —
 * `Intl.DateTimeFormat` with a `timeZone` is enough for day-boundary math.
 */

const DATE_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = DATE_FMT_CACHE.get(timezone);
  if (!fmt) {
    // en-CA formats as YYYY-MM-DD directly.
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    DATE_FMT_CACHE.set(timezone, fmt);
  }
  return fmt;
}

const PARTS_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timezone: string): Intl.DateTimeFormat {
  let fmt = PARTS_FMT_CACHE.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    PARTS_FMT_CACHE.set(timezone, fmt);
  }
  return fmt;
}

/** 'YYYY-MM-DD' for the given instant, in the given IANA timezone. */
export function localDateString(ms: number, timezone: string): string {
  return dateFormatter(timezone).format(new Date(ms));
}

/** The hour (0-23) of the given instant, in the given IANA timezone. */
export function localHour(ms: number, timezone: string): number {
  const parts = partsFormatter(timezone).formatToParts(new Date(ms));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  return hour % 24;
}

/**
 * The UTC epoch ms of local midnight for `localDate` ('YYYY-MM-DD') in
 * `timezone`. Works by guessing the offset is 0, reading back what that
 * guess displays as in the target timezone, and correcting by the
 * difference — standard technique for offset-free Intl-based tz math.
 */
export function localMidnightMs(localDate: string, timezone: string): number {
  const [y, m, d] = localDate.split('-').map(Number) as [number, number, number];
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const parts = partsFormatter(timezone).formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const displayedAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  const offsetMs = displayedAsUtc - utcGuess;
  return utcGuess - offsetMs;
}

export interface LocalDayBounds {
  localDate: string;
  startMs: number;
  endMs: number;
}

/** [local midnight, next local midnight) for the instant `ms`, in `timezone`. */
export function localDayBounds(ms: number, timezone: string): LocalDayBounds {
  const localDate = localDateString(ms, timezone);
  const startMs = localMidnightMs(localDate, timezone);
  const endMs = localMidnightMs(addLocalDays(localDate, 1), timezone);
  return { localDate, startMs, endMs };
}

/** Adds `days` calendar days to a 'YYYY-MM-DD' string (handles month/year rollover). */
export function addLocalDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 'YYYY-MM' for a local date, used by the shields table (spec 5.4, 2 per month). */
export function localMonthString(localDate: string): string {
  return localDate.slice(0, 7);
}

/** Calendar-day difference `b - a` for two 'YYYY-MM-DD' strings (timezone-free, both already local). */
export function daysBetweenLocalDates(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((bMs - aMs) / (24 * 60 * 60 * 1000));
}

/** Every 'YYYY-MM-DD' strictly after `from` and up to and including `to`. */
export function localDateRange(from: string, to: string): string[] {
  const count = daysBetweenLocalDates(from, to);
  const dates: string[] = [];
  for (let i = 1; i <= count; i++) {
    dates.push(addLocalDays(from, i));
  }
  return dates;
}
