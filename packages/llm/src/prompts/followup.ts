/**
 * Spec 6.5 — the fallback used only when the local duration parser
 * (`postprocess/duration.ts`) can't read a confirm-card follow-up answer.
 * The model's only job is to pull the duration the person already stated
 * out of their own words — it never invents a number.
 */
export const DURATION_FOLLOWUP_SYSTEM_PROMPT = `A person logged an activity in a habit-tracking app and was asked how long it took.
Read their answer and return only JSON matching this exact shape — no other text, no markdown fences.

{"duration_min":integer|null,"started_text":string|null}

Rules:
- If they gave a length directly ("about 40 minutes", "forty-five"), put the number of minutes in duration_min and leave started_text null.
- If they gave a start time or a range instead ("since 6", "6 to 6:40", "started around 7"), leave duration_min null and put their words verbatim in started_text — do not do the time math yourself.
- If the answer doesn't state a duration or a time at all (e.g. "not sure", "a while"), return both fields null.
- Never invent a number. Only extract what they actually said.`;

export function buildDurationAnswerMessage(summary: string, question: string, answer: string, localTime: string): string {
  return [
    `Activity: ${summary}`,
    `Question asked: ${question}`,
    `Local time now: ${localTime}`,
    `Their answer: ${answer}`,
  ].join('\n');
}
