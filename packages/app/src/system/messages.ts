/**
 * Spec 6.8 — system feed messages are templates, not LLM output.
 * `template_key` maps to three strings (strict, neutral, encouraging) with
 * `{params}` substitution. Short plain log sentences, full stop, no
 * exclamation marks except in Encouraging, no emoji.
 */
export type Tone = 'strict' | 'neutral' | 'encouraging';

type Template = (params: Record<string, string | number>) => string;

export const MESSAGE_TEMPLATES: Record<string, Record<Tone, Template>> = {
  stat_up: {
    neutral: (p) => `${p.stat} increased by ${p.amount}.`,
    strict: (p) => `${p.stat} +${p.amount}.`,
    encouraging: (p) => `${p.stat} is up ${p.amount}. Nice work.`,
  },
  quest_done: {
    neutral: (p) => `Quest complete: ${p.title}. +${p.xp} XP.`,
    strict: (p) => `Quest complete. +${p.xp} XP.`,
    encouraging: (p) => `${p.title}, done. +${p.xp} XP.`,
  },
  deadline_missed: {
    neutral: (p) => `Deadline missed. HP decreased by ${p.hp}.`,
    strict: (p) => `Deadline missed. HP -${p.hp}. Do not repeat it.`,
    encouraging: (p) => `That one slipped. HP is down ${p.hp}, and you can win it back today.`,
  },
  title_earned: {
    neutral: (p) => `Title earned: ${p.title}.`,
    strict: (p) => `Title earned: ${p.title}.`,
    encouraging: (p) => `You earned ${p.title}.`,
  },
  level_up: {
    neutral: (p) => `Level ${p.level} reached. HP restored.`,
    strict: (p) => `Level ${p.level}. HP restored.`,
    encouraging: (p) => `Level ${p.level}! HP is full again.`,
  },
  rank_up: {
    neutral: (p) => `Rank ${p.rank} reached.`,
    strict: (p) => `Rank ${p.rank}.`,
    encouraging: (p) => `You are rank ${p.rank} now. Well earned.`,
  },
  rank_trial_unlocked: {
    neutral: (p) => `Rank ${p.rank} trial unlocked. 7 days to pass it.`,
    strict: (p) => `Rank ${p.rank} trial unlocked. 7 days.`,
    encouraging: (p) => `A rank ${p.rank} trial just opened up. 7 days — you've got this.`,
  },
  penalty_zone_entered: {
    neutral: () => 'HP reached 0. Penalty Zone entered.',
    strict: () => 'HP at 0. Penalty Zone. Fix it.',
    encouraging: () => "HP hit 0, but there's a way back. Penalty Zone entered.",
  },
  penalty_zone_exited: {
    neutral: () => 'Penalty Zone cleared. Recovery complete.',
    strict: () => 'Penalty Zone cleared.',
    encouraging: () => "Penalty Zone cleared. You're back.",
  },
  hp_low: {
    neutral: (p) => `HP is low, at ${p.hp}.`,
    strict: (p) => `HP low: ${p.hp}.`,
    encouraging: (p) => `HP is at ${p.hp}. Worth a rest soon.`,
  },
};

export function renderMessage(templateKey: string, tone: Tone, params: Record<string, string | number> = {}): string {
  const template = MESSAGE_TEMPLATES[templateKey]?.[tone];
  if (!template) return templateKey;
  return template(params);
}
