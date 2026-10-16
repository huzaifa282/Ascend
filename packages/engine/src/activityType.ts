/**
 * Spec 5.2 — the coarse activity type an activity's XP rate is keyed on.
 * Distinct from `plausibility.ts`'s `ActivityClass` (which only exists to
 * pick a speed/pace sanity check): this taxonomy exists to pick an XP rate,
 * so it covers every kind of loggable activity, not just ones with a
 * plausible pace.
 */
export const ACTIVITY_TYPES = [
  'cardio',
  'strength',
  'sport',
  'mobility',
  'deep_work',
  'learning',
  'reading',
  'creative',
  'mindfulness',
  'social',
  'chores',
  'other',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * Coarse keyword fallback for when the model's own `activity_type` guess is
 * missing — mirrors `classifyActivity`'s shape (spec 5.9) but a broader
 * taxonomy, since this one picks an XP rate rather than a plausibility check.
 */
export function classifyActivityType(activityClass: string): ActivityType {
  const c = activityClass.toLowerCase();

  if (
    c.includes('run') || c.includes('jog') || c.includes('walk') || c.includes('hike') ||
    c.includes('cycl') || c.includes('bike') || c.includes('biking') || c.includes('swim') ||
    c.includes('cardio') || c.includes('row')
  ) {
    return 'cardio';
  }
  if (
    c.includes('lift') || c.includes('weight') || c.includes('gym') || c.includes('strength') ||
    c.includes('squat') || c.includes('deadlift') || c.includes('bench') || c.includes('crossfit')
  ) {
    return 'strength';
  }
  if (
    c.includes('basketball') || c.includes('soccer') || c.includes('football') || c.includes('tennis') ||
    c.includes('badminton') || c.includes('volleyball') || c.includes('sport') || c.includes('match')
  ) {
    return 'sport';
  }
  if (c.includes('stretch') || c.includes('yoga') || c.includes('mobility') || c.includes('pilates')) {
    return 'mobility';
  }
  if (c.includes('meditat') || c.includes('breathing') || c.includes('mindfulness')) {
    return 'mindfulness';
  }
  if (c.includes('read')) {
    return 'reading';
  }
  if (c.includes('study') || c.includes('learn') || c.includes('course') || c.includes('lecture') || c.includes('tutorial')) {
    return 'learning';
  }
  if (
    c.includes('draw') || c.includes('paint') || c.includes('music') || c.includes('compose') ||
    c.includes('art') || c.includes('creative') || c.includes('design')
  ) {
    return 'creative';
  }
  if (
    c.includes('code') || c.includes('coding') || c.includes('program') || c.includes('debug') ||
    c.includes('develop') || c.includes('deep work') || c.includes('work')
  ) {
    return 'deep_work';
  }
  if (c.includes('call') || c.includes('meeting') || c.includes('social') || c.includes('family')) {
    return 'social';
  }
  if (
    c.includes('clean') || c.includes('chore') || c.includes('laundry') || c.includes('dishes') ||
    c.includes('cook') || c.includes('errand') || c.includes('grocery')
  ) {
    return 'chores';
  }
  return 'other';
}
