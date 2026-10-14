/** Spec 5.9 — Plausibility rules (deterministic). */
import type { Ruleset } from './ruleset';

export type ActivityClass = 'running' | 'walking' | 'cycling' | 'swimming' | 'reading' | 'other';

/** Coarse keyword classification of the LLM's free-text `activity_class`. */
export function classifyActivity(activityClass: string): ActivityClass {
  const c = activityClass.toLowerCase();
  if (c.includes('run') || c.includes('jog')) return 'running';
  if (c.includes('walk') || c.includes('hike')) return 'walking';
  if (c.includes('cycl') || c.includes('bike') || c.includes('biking')) return 'cycling';
  if (c.includes('swim')) return 'swimming';
  if (c.includes('read')) return 'reading';
  return 'other';
}

export function speedKmh(distanceKm: number, durationMin: number): number | null {
  if (durationMin <= 0) return null;
  return distanceKm / (durationMin / 60);
}

export interface PlausibilityInput {
  activityClass: string;
  durationMin: number;
  distanceKm: number | null;
  pages: number | null;
  xp: number;
  /** Total minutes already logged today across all activities, including this one. */
  totalLoggedTodayMinutes: number;
}

export interface PlausibilityResult {
  flagged: boolean;
  reasons: string[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Flags an activity (XP x0.2 until confirmed) when any rule in spec 5.9 trips. */
export function checkPlausibility(input: PlausibilityInput, ruleset: Ruleset): PlausibilityResult {
  const reasons: string[] = [];
  const p = ruleset.plausibility;
  const activityClass = classifyActivity(input.activityClass);

  if (input.durationMin === 0 && input.xp !== 0) {
    reasons.push('Implausible: 0 minutes logged with XP.');
  }
  if (input.durationMin > p.maxSingleActivityHours * 60) {
    reasons.push(`Implausible: over ${p.maxSingleActivityHours} hours in one activity.`);
  }
  if (input.totalLoggedTodayMinutes > p.maxDailyTotalHours * 60) {
    reasons.push(`Implausible: over ${p.maxDailyTotalHours} hours logged today.`);
  }

  if (input.distanceKm != null && input.distanceKm > 0) {
    const speed = speedKmh(input.distanceKm, input.durationMin);
    if (speed != null) {
      if (activityClass === 'running' && (speed > p.running.maxSpeedKmh || speed < p.running.minSpeedKmh)) {
        reasons.push(`Implausible: ${round1(speed)} km/h.`);
      }
      if (activityClass === 'walking' && speed > p.walking.maxSpeedKmh) {
        reasons.push(`Implausible: ${round1(speed)} km/h.`);
      }
      if (activityClass === 'cycling' && speed > p.cycling.maxSpeedKmh) {
        reasons.push(`Implausible: ${round1(speed)} km/h.`);
      }
      if (activityClass === 'swimming' && speed > p.swimming.maxSpeedKmh) {
        reasons.push(`Implausible: ${round1(speed)} km/h.`);
      }
    }
  }

  if (activityClass === 'reading' && input.pages != null && input.pages > 0 && input.durationMin > 0) {
    const pagesPerHour = input.pages / (input.durationMin / 60);
    if (pagesPerHour > p.reading.maxPagesPerHour) {
      reasons.push(`Implausible: ${Math.round(pagesPerHour)} pages per hour.`);
    }
  }

  return { flagged: reasons.length > 0, reasons };
}
