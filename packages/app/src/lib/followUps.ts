/**
 * Spec 6.1/9.2 — pure presentation helpers for the confirm card's log
 * follow-ups. Picking closer duration guesses and type-fitting effort labels
 * is UI convenience, not progression: nothing here computes XP or writes
 * anything, and every suggestion still requires the person's own Accept.
 */
import type { ActivityType } from '@ascendant/engine';

const BASE_DURATION_OPTIONS: Record<ActivityType, number[]> = {
  cardio: [20, 30, 45, 60],
  strength: [20, 30, 45, 60],
  sport: [30, 45, 60, 90],
  mobility: [10, 15, 20, 30],
  deep_work: [30, 60, 90, 120],
  learning: [20, 30, 45, 60],
  reading: [10, 20, 30, 45, 60],
  creative: [20, 30, 45, 60],
  mindfulness: [5, 10, 15, 20],
  social: [15, 30, 45, 60],
  chores: [10, 15, 20, 30],
  other: [15, 30, 45, 60, 90],
};

const CARDIO_MIN_PER_KM = 6;
const READING_MIN_PER_PAGE = 1.5;
const MAX_SUGGESTIONS = 5;

function roundToNearest5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Suggested "how long?" pills, closest-guess for the activity type — and,
 * when the note gave a distance (cardio) or page count (reading), centered
 * on a rough estimate from it, alongside the type's usual options.
 */
export function durationSuggestions(type: ActivityType, distanceKm: number | null, pages: number | null): string[] {
  const base = BASE_DURATION_OPTIONS[type] ?? BASE_DURATION_OPTIONS.other;

  let estimate: number | null = null;
  if (type === 'cardio' && distanceKm != null && distanceKm > 0) {
    estimate = roundToNearest5(distanceKm * CARDIO_MIN_PER_KM);
  } else if (type === 'reading' && pages != null && pages > 0) {
    estimate = roundToNearest5(pages * READING_MIN_PER_PAGE);
  }

  const values = estimate != null ? [estimate, ...base] : [...base];
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);

  if (unique.length <= MAX_SUGGESTIONS) return unique.map(String);

  // Trim to MAX_SUGGESTIONS, keeping the distance/page estimate if there is one.
  if (estimate != null) {
    const withoutEstimate = unique.filter((v) => v !== estimate);
    return [estimate, ...withoutEstimate.slice(0, MAX_SUGGESTIONS - 1)].sort((a, b) => a - b).map(String);
  }
  return unique.slice(0, MAX_SUGGESTIONS).map(String);
}

export interface EffortLabels {
  light: string;
  moderate: string;
  hard: string;
}

const EFFORT_LABELS: Record<ActivityType, EffortLabels> = {
  cardio: { light: 'Easy pace', moderate: 'Steady', hard: 'Pushed hard' },
  strength: { light: 'Light', moderate: 'Working sets', hard: 'To failure' },
  sport: { light: 'Casual', moderate: 'Competitive', hard: 'All out' },
  mobility: { light: 'Gentle', moderate: 'Normal', hard: 'Deep stretch' },
  deep_work: { light: 'Distracted', moderate: 'Focused', hard: 'Locked in' },
  learning: { light: 'Skimmed', moderate: 'Engaged', hard: 'Intense study' },
  reading: { light: 'Leisurely', moderate: 'Focused', hard: 'Deep read' },
  creative: { light: 'Light', moderate: 'Focused', hard: 'In the zone' },
  mindfulness: { light: 'Brief', moderate: 'Normal', hard: 'Deep session' },
  social: { light: 'Quick', moderate: 'Normal', hard: 'Long and deep' },
  chores: { light: 'Quick', moderate: 'Normal', hard: 'Thorough' },
  other: { light: 'Light', moderate: 'Moderate', hard: 'Hard' },
};

/** Effort labels that fit the activity type — "Pushed hard" for a run, "To failure" for lifting, etc. */
export function effortLabels(type: ActivityType): EffortLabels {
  return EFFORT_LABELS[type] ?? EFFORT_LABELS.other;
}
