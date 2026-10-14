/**
 * Spec 6.1 steps 2-3 — calls the provider, validates the JSON response
 * against InterpretationSchema, and retries once with the validation error
 * appended on failure. Post-processing (6.5) and persistence happen one
 * layer up, in an app service that has engine + DB access.
 */
import { INTERPRET_SYSTEM_PROMPT, buildInterpretUserMessage, type InterpretContext } from './prompts/interpret';
import { InterpretationSchema, type Interpretation } from './schemas';
import type { Provider } from './providers/types';

export interface InterpretResult {
  ok: boolean;
  interpretation?: Interpretation;
  tokensIn: number;
  tokensOut: number;
  /** Set when both attempts failed validation, or the call itself threw. */
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

async function callAndValidate(
  provider: Provider,
  userMessage: string,
  extraSystemNote: string | undefined,
): Promise<{ parsed: Interpretation | null; raw: string; tokensIn: number; tokensOut: number; error: string | null }> {
  const system = extraSystemNote ? `${INTERPRET_SYSTEM_PROMPT}\n\n${extraSystemNote}` : INTERPRET_SYSTEM_PROMPT;
  const result = await provider.complete({
    system,
    messages: [{ role: 'user', content: userMessage }],
    json: true,
    maxTokens: 1024,
  });

  const jsonText = extractFirstJsonObject(result.text) ?? result.text;
  let candidate: unknown;
  try {
    candidate = JSON.parse(jsonText);
  } catch {
    return { parsed: null, raw: result.text, tokensIn: result.tokensIn, tokensOut: result.tokensOut, error: 'Response was not valid JSON.' };
  }

  const validation = InterpretationSchema.safeParse(candidate);
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

  const first = await callAndValidate(provider, userMessage, undefined);
  if (first.parsed) {
    return { ok: true, interpretation: first.parsed, tokensIn: first.tokensIn, tokensOut: first.tokensOut };
  }

  const retry = await callAndValidate(
    provider,
    userMessage,
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
