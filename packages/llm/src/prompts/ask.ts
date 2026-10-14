/** Spec 6.6 — "Ask the System" chat: a compact summary, answered in the chosen tone. */
export type Tone = 'strict' | 'neutral' | 'encouraging';

export interface AskSystemSummary {
  level: number;
  rank: string;
  hp: number;
  streakDays: number;
  xpToday: number;
  last14DaysXp: number[];
  stats: Array<{ code: string; value: number; sevenDayGain: number }>;
  openTasks: Array<{ title: string; dueLocal: string | null }>;
  dailiesDoneToday: number;
  dailiesTotal: number;
}

const TONE_INSTRUCTION: Record<Tone, string> = {
  strict: 'Answer in a strict, no-nonsense tone.',
  neutral: 'Answer in a plain, neutral tone.',
  encouraging: 'Answer in a warm, encouraging tone.',
};

export function buildAskSystemPrompt(tone: Tone): string {
  return `You are "the System" in a life-RPG habit app, answering a question about the person's own progress.
${TONE_INSTRUCTION[tone]} Reply in 2 to 5 sentences of plain text. No markdown headers, no bullet lists, no emoji.
Use only the summary given below — do not invent numbers.`;
}

export function buildAskSystemContext(summary: AskSystemSummary): string {
  const lines = [
    `Level ${summary.level}, rank ${summary.rank}, HP ${summary.hp}/100, streak ${summary.streakDays} days.`,
    `XP today: ${summary.xpToday}.`,
    `XP over the last 14 days: ${summary.last14DaysXp.join(', ')}.`,
    `Stats (value, 7-day gain): ${summary.stats.map((s) => `${s.code} ${s.value} (+${s.sevenDayGain})`).join(', ')}.`,
    `Dailies done today: ${summary.dailiesDoneToday} of ${summary.dailiesTotal}.`,
    `Open tasks: ${
      summary.openTasks.length
        ? summary.openTasks.map((t) => `${t.title}${t.dueLocal ? ` (due ${t.dueLocal})` : ''}`).join('; ')
        : '(none)'
    }.`,
  ];
  return lines.join('\n');
}

export const ASK_SYSTEM_SUGGESTED_PROMPTS = [
  'What should I focus on this week?',
  'What is left today?',
  'Why did my HP drop?',
  'Plan my week',
] as const;
