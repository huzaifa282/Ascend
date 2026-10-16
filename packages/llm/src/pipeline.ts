/**
 * Spec 6.1 steps 2-3 — calls the provider, validates the JSON response
 * against a Zod schema, and retries once with the validation error appended
 * on failure. Post-processing (6.5) and persistence happen one layer up, in
 * an app service that has engine + DB access.
 */
import type { ZodType } from 'zod';
import { INTERPRET_SYSTEM_PROMPT, buildInterpretUserMessage, type InterpretContext } from './prompts/interpret';
import { DURATION_FOLLOWUP_SYSTEM_PROMPT, buildDurationAnswerMessage } from './prompts/followup';
import { DurationAnswerSchema, InterpretationSchema, type DurationAnswer, type Interpretation } from './schemas';
import type { Provider } from './providers/types';

export interface InterpretResult {
  ok: boolean;
  interpretation?: Interpretation;
  tokensIn: number;
  tokensOut: number;
  /** Set when both attempts failed validation, or the call itself threw. */
  error?: string;
}

export interface DurationAnswerResult {
  ok: boolean;
  answer?: DurationAnswer;
  tokensIn: number;
  tokensOut: number;
  error?: string;
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

async function callAndValidate<T>(
  provider: Provider,
  systemPrompt: string,
  schema: ZodType<T>,
  userMessage: string,
  maxTokens: number,
  extraSystemNote: string | undefined,
): Promise<{ parsed: T | null; raw: string; tokensIn: number; tokensOut: number; error: string | null }> {
  const system = extraSystemNote ? `${systemPrompt}\n\n${extraSystemNote}` : systemPrompt;
  const result = await provider.complete({
    system,
    messages: [{ role: 'user', content: userMessage }],
    json: true,
    maxTokens,
  });

  const jsonText = extractFirstJsonObject(result.text) ?? result.text;
  let candidate: unknown;
  try {
    candidate = JSON.parse(jsonText);
  } catch {
    return { parsed: null, raw: result.text, tokensIn: result.tokensIn, tokensOut: result.tokensOut, error: 'Response was not valid JSON.' };
  }

  const validation = schema.safeParse(candidate);
  if (!validation.success) {
    return {
      parsed: null,
      raw: result.text,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      error: validation.error.message,
    };
  }
  return { parsed: validation.data, raw: result.text, tokensIn: result.tokensIn, tokensOut: result.tokensOut, error: null };
}

export async function interpretNote(
  provider: Provider,
  noteText: string,
  context: InterpretContext,
): Promise<InterpretResult> {
  const userMessage = buildInterpretUserMessage(noteText, context);

  const first = await callAndValidate(provider, INTERPRET_SYSTEM_PROMPT, InterpretationSchema, userMessage, 1024, undefined);
  if (first.parsed) {
    return { ok: true, interpretation: first.parsed, tokensIn: first.tokensIn, tokensOut: first.tokensOut };
  }

  const retry = await callAndValidate(
    provider,
    INTERPRET_SYSTEM_PROMPT,
    InterpretationSchema,
    userMessage,
    1024,
    `Your previous response failed validation: ${first.error}\nReturn corrected JSON matching the schema exactly.`,
  );
  if (retry.parsed) {
    return {
      ok: true,
      interpretation: retry.parsed,
      tokensIn: first.tokensIn + retry.tokensIn,
      tokensOut: first.tokensOut + retry.tokensOut,
    };
  }

  return {
    ok: false,
    tokensIn: first.tokensIn + retry.tokensIn,
    tokensOut: first.tokensOut + retry.tokensOut,
    error: retry.error ?? first.error ?? 'Unknown error.',
  };
}

/**
 * Spec 6.5's model fallback for a duration follow-up answer the local
 * parser couldn't read. Same one-retry pattern as `interpretNote`, on a much
 * smaller schema/prompt/token budget since this is a single short answer,
 * not a whole note.
 */
export async function extractDurationAnswer(
  provider: Provider,
  summary: string,
  question: string,
  answerText: string,
  localTime: string,
): Promise<DurationAnswerResult> {
  const userMessage = buildDurationAnswerMessage(summary, question, answerText, localTime);

  const first = await callAndValidate(provider, DURATION_FOLLOWUP_SYSTEM_PROMPT, DurationAnswerSchema, userMessage, 128, undefined);
  if (first.parsed) {
    return { ok: true, answer: first.parsed, tokensIn: first.tokensIn, tokensOut: first.tokensOut };
  }

  const retry = await callAndValidate(
    provider,
    DURATION_FOLLOWUP_SYSTEM_PROMPT,
    DurationAnswerSchema,
    userMessage,
    128,
    `Your previous response failed validation: ${first.error}\nReturn corrected JSON matching the schema exactly.`,
  );
  if (retry.parsed) {
    return {
      ok: true,
      answer: retry.parsed,
      tokensIn: first.tokensIn + retry.tokensIn,
      tokensOut: first.tokensOut + retry.tokensOut,
    };
  }

  return {
    ok: false,
    tokensIn: first.tokensIn + retry.tokensIn,
    tokensOut: first.tokensOut + retry.tokensOut,
    error: retry.error ?? first.error ?? 'Unknown error.',
  };
}
