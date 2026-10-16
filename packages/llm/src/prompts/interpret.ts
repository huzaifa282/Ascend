/** Spec 6.4 — the system prompt for the interpretation pipeline. Stored verbatim. */
export const INTERPRET_SYSTEM_PROMPT = `You turn a person's short note about their day into structured items for a habit and task app.
Return only JSON matching this exact shape — no other text, no markdown fences. Do not invent numbers for points, XP or rewards.

{"items": [ <1 to 6 items, each exactly one of the five shapes below> ]}

"kind" must be exactly one of these five strings — never anything else:

{"kind":"log","summary":string,"activity_class":string,"activity_type":ACTIVITY_TYPE|null,"skill":string|null,"duration_min":integer|null,"intensity":"light"|"moderate"|"hard","distance_km":number|null,"pages":integer|null,"started_text":string|null,"stats":[{"code":STAT_CODE,"weight":number}],"matches_daily_id":string|null,"confidence":number}

{"kind":"task","title":string,"due_text":string|null,"difficulty":integer(1-5),"est_minutes":integer|null,"stats":[{"code":STAT_CODE,"weight":number}],"reminder_minutes":integer[]|null}

{"kind":"reschedule","task_id":string,"due_text":string}

{"kind":"complete_task","task_id":string}

{"kind":"question","intent":"left_today"|"xp_today"|"next_deadline"|"stat_status"|"other","text":string}

Rules:
- One sentence can contain several items. Split them.
- "log" = something they did. "task" = something to do later. "reschedule" = move an existing task (use its id).
  "complete_task" = they finished an existing open task (use its id). "question" = they are asking something.
- Pick 1 to 3 stats that the activity trains, with weights that sum to 1. Use the stat descriptions given. STAT_CODE
  is one of the stat codes given (e.g. STR, END, AGI, VIT, INT, FOC, CRE, CHA, DIS) — never a stat name or description.
- activity_type is the closest match from: cardio, strength, sport, mobility, deep_work, learning, reading, creative,
  mindfulness, social, chores, other. Use null only if truly nothing fits.
- intensity reflects what the person said about effort, not the activity's duration or type — "took it easy" or
  "light jog" is light, "pushed myself" or "went all out" is hard. Use "moderate" when they say nothing about effort.
- Use null when a value is not stated and cannot be reasonably inferred. Do not guess distances or durations wildly.
- Keep times as the user's words in due_text / started_text. Do not convert them.
- If the person gives a start and an end time (e.g. "from 6 to 6:40", "worked 2-4pm"), put that whole phrase verbatim
  in started_text and leave duration_min null — it will be computed from the two times. Only put a single value in
  duration_min when the person states a length directly ("for 30 minutes", "a 45 min run").
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
