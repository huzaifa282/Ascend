/** Spec 5.8 — Skills. */
import type { Ruleset } from './ruleset';

/** skill_level = floor(sqrt(skill_xp / 50)) + 1. */
export function skillLevel(skillXp: number, ruleset: Ruleset): number {
  return Math.floor(Math.sqrt(Math.max(0, skillXp) / ruleset.skills.levelDivisor)) + 1;
}

/** An unlinked activity label seen 5+ times in 21 days creates a skill suggestion. */
export function shouldSuggestSkill(occurrencesInWindow: number, ruleset: Ruleset): boolean {
  return occurrencesInWindow >= ruleset.skills.suggestionCount;
}

export function suggestionWindowMs(ruleset: Ruleset): number {
  return ruleset.skills.suggestionWindowDays * 24 * 60 * 60 * 1000;
}

/** Dismissed labels are not suggested again for 60 days. */
export function isSuggestionSuppressed(dismissedAtMs: number, nowMs: number, ruleset: Ruleset): boolean {
  const suppressMs = ruleset.skills.suggestionDismissDays * 24 * 60 * 60 * 1000;
  return nowMs - dismissedAtMs < suppressMs;
}
