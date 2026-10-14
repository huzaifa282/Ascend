/** Spec 6.5 — daily match: accept the model's matches_daily_id if valid, else fuzzy-match as a fallback suggestion. */

function normalizeTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = normalizeTokens(a);
  const setB = normalizeTokens(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface DailyCandidate {
  id: string;
  title: string;
  doneToday: boolean;
}

export interface DailyMatchResult {
  dailyId: string;
  title: string;
  /** True when the model's own matches_daily_id was accepted directly. */
  fromModel: boolean;
}

/**
 * Accepts `matchesDailyId` only if it names a real, not-yet-done daily;
 * otherwise falls back to the best fuzzy match (Jaccard >= 0.5) against the
 * log's summary/activity class.
 */
export function matchDaily(
  summaryText: string,
  matchesDailyId: string | null,
  dailies: DailyCandidate[],
): DailyMatchResult | null {
  if (matchesDailyId) {
    const daily = dailies.find((d) => d.id === matchesDailyId);
    if (daily && !daily.doneToday) {
      return { dailyId: daily.id, title: daily.title, fromModel: true };
    }
  }

  let best: { daily: DailyCandidate; score: number } | null = null;
  for (const daily of dailies) {
    if (daily.doneToday) continue;
    const score = jaccardSimilarity(summaryText, daily.title);
    if (score >= 0.5 && (!best || score > best.score)) {
      best = { daily, score };
    }
  }
  return best ? { dailyId: best.daily.id, title: best.daily.title, fromModel: false } : null;
}
