/** Spec 6.4 — the system prompt for the interpretation pipeline. Stored verbatim. */
export const INTERPRET_SYSTEM_PROMPT = `You turn a person's short note about their day into structured items for a habit and task app.
Return only JSON that matches the provided schema. Do not invent numbers for points, XP or rewards.

Rules:
- One sentence can contain several items. Split them.
- "log" = something they did. "task" = something to do later. "reschedule" = move an existing task (use its id).
  "complete_task" = they finished an existing open task (use its id). "question" = they are asking something.
- Pick 1 to 3 stats that the activity trains, with weights that sum to 1. Use the stat descriptions given.
- Use null when a value is not stated and cannot be reasonably inferred. Do not guess distances or durations wildly.
- Keep times as the user's words in due_text / started_text. Do not convert them.
- If the activity clearly completes one of the listed daily quests, put its id in matches_daily_id.
- difficulty for tasks: 1 trivial, 2 easy, 3 normal, 4 hard, 5 very hard.
- confidence is how sure you are about the whole item, 0 to 1.`;

/** Spec 6.3 — the only context sent with each interpretation request. */
export interface InterpretContext {
  localDate: string;
  weekday: string;
  localTime: string;
  timezone: string;
  stats: Array<{ code: string; name: string; description: string }>;
  activeDailies: Array<{ id: string; title: string; statCodes: string[] }>;
  openTasks: Array<{ id: string; title: string; dueLocal: string | null }>;
  knownSkills: Array<{ name: string; statCodes: string[] }>;
}

export function buildInterpretUserMessage(noteText: string, ctx: InterpretContext): string {
  const lines = [
    `Local date: ${ctx.localDate} (${ctx.weekday}), time ${ctx.localTime}, timezone ${ctx.timezone}.`,
    '',
    'Stats:',
    ...ctx.stats.map((s) => `- ${s.code} (${s.name}): ${s.description}`),
    '',
    'Active dailies:',
    ...(ctx.activeDailies.length
      ? ctx.activeDailies.map((d) => `- ${d.id}: ${d.title} [${d.statCodes.join(', ')}]`)
      : ['(none)']),
    '',
    'Open tasks:',
    ...(ctx.openTasks.length
      ? ctx.openTasks.map((t) => `- ${t.id}: ${t.title}${t.dueLocal ? ` (due ${t.dueLocal})` : ''}`)
      : ['(none)']),
    '',
    'Known skills:',
    ...(ctx.knownSkills.length
      ? ctx.knownSkills.slice(0, 50).map((s) => `- ${s.name} [${s.statCodes.join(', ')}]`)
      : ['(none)']),
    '',
    'Note:',
    noteText,
  ];
  return lines.join('\n');
}
