/**
 * Spec 10.1 step 2 — the questionnaire's answers set starting stat XP.
 * Six questions, one stat group each; XP values are chosen so
 * `statValue()` (scale 2000) lands starting values roughly between 5 and
 * 35, per spec's own description of the intended range.
 */
import type { StatCode } from '@ascendant/engine';

export const STAT_NAMES: Record<StatCode, { name: string; sort: number }> = {
  STR: { name: 'Strength', sort: 0 },
  END: { name: 'Endurance', sort: 1 },
  AGI: { name: 'Agility', sort: 2 },
  VIT: { name: 'Vitality', sort: 3 },
  INT: { name: 'Intellect', sort: 4 },
  FOC: { name: 'Focus', sort: 5 },
  CRE: { name: 'Creativity', sort: 6 },
  CHA: { name: 'Charisma', sort: 7 },
  DIS: { name: 'Discipline', sort: 8 },
};

export interface OnboardingQuestionOption {
  label: string;
  xp: number;
}

export interface OnboardingQuestion {
  id: string;
  prompt: string;
  statCodes: StatCode[];
  options: OnboardingQuestionOption[];
}

const SCALE = [0, 100, 250, 450, 750, 1000];

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'exercise',
    prompt: 'How many days a week do you exercise?',
    statCodes: ['STR', 'END', 'AGI'],
    options: ['0', '1-2', '3-4', '5-6', 'Every day'].map((label, i) => ({ label, xp: SCALE[i]! })),
  },
  {
    id: 'sleep',
    prompt: "What's your average night of sleep?",
    statCodes: ['VIT'],
    options: ['Under 5h', '5-6h', '6-7h', '7-8h', '8h+'].map((label, i) => ({ label, xp: SCALE[i]! })),
  },
  {
    id: 'focus',
    prompt: 'How many hours of focused study or work do you get most days?',
    statCodes: ['INT', 'FOC'],
    options: ['Under 1h', '1-2h', '2-4h', '4-6h', '6h+'].map((label, i) => ({ label, xp: SCALE[i]! })),
  },
  {
    id: 'creative',
    prompt: 'How much creative practice do you do in a week?',
    statCodes: ['CRE'],
    options: ['None', 'A little', 'A few sessions', 'Several sessions', 'Daily'].map((label, i) => ({
      label,
      xp: SCALE[i]!,
    })),
  },
  {
    id: 'social',
    prompt: "What's your social time like in a week?",
    statCodes: ['CHA'],
    options: ['Mostly alone', 'A little', 'Moderate', 'Plenty', 'Constant'].map((label, i) => ({ label, xp: SCALE[i]! })),
  },
  {
    id: 'plans',
    prompt: 'How often do your plans actually get done?',
    statCodes: ['DIS'],
    options: ['Rarely', 'Sometimes', 'About half', 'Usually', 'Almost always'].map((label, i) => ({
      label,
      xp: SCALE[i]!,
    })),
  },
];

export type OnboardingAnswers = Record<string, number>; // questionId -> selected option index

/** Spreads each question's xp evenly across its stat codes, summed per stat. */
export function baselineStatXp(answers: OnboardingAnswers): Partial<Record<StatCode, number>> {
  const result: Partial<Record<StatCode, number>> = {};
  for (const q of ONBOARDING_QUESTIONS) {
    const optionIndex = answers[q.id] ?? 0;
    const xp = q.options[optionIndex]?.xp ?? 0;
    const perStat = Math.round(xp / q.statCodes.length);
    for (const code of q.statCodes) {
      result[code] = (result[code] ?? 0) + perStat;
    }
  }
  return result;
}

export interface SuggestedDaily {
  title: string;
  statWeights: Partial<Record<StatCode, number>>;
  xp: number;
}

/** Spec step 6 — 5 daily suggestions preselected by the questionnaire. */
export function suggestedDailies(answers: OnboardingAnswers): SuggestedDaily[] {
  const all: SuggestedDaily[] = [
    { title: 'Move for 20 minutes', statWeights: { STR: 1, END: 1 }, xp: 15 },
    { title: 'Sleep by midnight', statWeights: { VIT: 1 }, xp: 10 },
    { title: 'One focused work block', statWeights: { INT: 1, FOC: 1 }, xp: 20 },
    { title: 'Make something', statWeights: { CRE: 1 }, xp: 15 },
    { title: 'Reach out to someone', statWeights: { CHA: 1 }, xp: 10 },
    { title: 'Plan tomorrow', statWeights: { DIS: 1 }, xp: 10 },
    { title: 'Stretch or mobility work', statWeights: { AGI: 1 }, xp: 10 },
  ];
  // Prefer the two lowest-answered areas plus the three always-useful defaults.
  const sortedByAnswer = [...ONBOARDING_QUESTIONS].sort((a, b) => (answers[a.id] ?? 0) - (answers[b.id] ?? 0));
  const priorityIds = new Set(sortedByAnswer.slice(0, 2).map((q) => q.id));
  const priorityTitles = new Set<string>();
  if (priorityIds.has('exercise')) priorityTitles.add('Move for 20 minutes');
  if (priorityIds.has('sleep')) priorityTitles.add('Sleep by midnight');
  if (priorityIds.has('focus')) priorityTitles.add('One focused work block');
  if (priorityIds.has('creative')) priorityTitles.add('Make something');
  if (priorityIds.has('social')) priorityTitles.add('Reach out to someone');
  if (priorityIds.has('plans')) priorityTitles.add('Plan tomorrow');

  const prioritized = all.filter((d) => priorityTitles.has(d.title));
  const rest = all.filter((d) => !priorityTitles.has(d.title));
  return [...prioritized, ...rest].slice(0, 5);
}
