import { describe, expect, it, vi } from 'vitest';
import { interpretNote } from './pipeline';
import type { Provider } from './providers/types';

const ctx = {
  localDate: '2026-10-14',
  weekday: 'Wednesday',
  localTime: '08:00',
  timezone: 'Asia/Karachi',
  stats: [{ code: 'END', name: 'Endurance', description: 'Running, cycling, swimming, long walks.' }],
  activeDailies: [],
  openTasks: [],
  knownSkills: [],
};

function fakeProvider(responses: string[]): Provider {
  let call = 0;
  return {
    id: 'openai',
    listModels: vi.fn(),
    complete: vi.fn(async () => {
      const text = responses[Math.min(call, responses.length - 1)]!;
      call += 1;
      return { text, tokensIn: 100, tokensOut: 50 };
    }),
    test: vi.fn(),
  };
}

describe('interpretNote', () => {
  it('parses a valid response on the first try', async () => {
    const provider = fakeProvider([
      JSON.stringify({
        items: [
          {
            kind: 'log',
            summary: 'Morning run, 5 km',
            activity_class: 'running',
            skill: 'Running',
            duration_min: 30,
            intensity: 'moderate',
            distance_km: 5,
            pages: null,
            started_text: 'this morning',
            stats: [{ code: 'END', weight: 1 }],
            matches_daily_id: null,
            confidence: 0.9,
          },
        ],
      }),
    ]);
    const result = await interpretNote(provider, 'ran 5k this morning', ctx);
    expect(result.ok).toBe(true);
    expect(result.interpretation?.items).toHaveLength(1);
    expect(result.tokensIn).toBe(100);
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it('extracts JSON embedded in extra prose', async () => {
    const provider = fakeProvider([
      `Sure, here is the JSON:\n${JSON.stringify({
        items: [{ kind: 'question', intent: 'xp_today', text: 'how much xp today' }],
      })}\nLet me know if you need more.`,
    ]);
    const result = await interpretNote(provider, 'how much xp do I have today', ctx);
    expect(result.ok).toBe(true);
    expect(result.interpretation?.items[0]).toMatchObject({ kind: 'question', intent: 'xp_today' });
  });

  it('retries once on invalid JSON and succeeds on the second try', async () => {
    const provider = fakeProvider([
      'not json at all',
      JSON.stringify({ items: [{ kind: 'question', intent: 'other', text: 'what is up' }] }),
    ]);
    const result = await interpretNote(provider, 'what is up', ctx);
    expect(result.ok).toBe(true);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('retries once on schema validation failure and succeeds on the second try', async () => {
    const provider = fakeProvider([
      JSON.stringify({ items: [{ kind: 'log' }] }), // missing required fields
      JSON.stringify({
        items: [
          {
            kind: 'log',
            summary: 'Read a book',
            activity_class: 'reading',
            skill: null,
            duration_min: 20,
            intensity: 'light',
            distance_km: null,
            pages: 30,
            started_text: null,
            stats: [{ code: 'INT', weight: 1 }],
            matches_daily_id: null,
            confidence: 0.8,
          },
        ],
      }),
    ]);
    const result = await interpretNote(provider, 'read for 20 minutes', ctx);
    expect(result.ok).toBe(true);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('fails after two bad attempts and surfaces an error', async () => {
    const provider = fakeProvider(['nonsense', 'still nonsense']);
    const result = await interpretNote(provider, 'gibberish', ctx);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it('never outputs XP, HP, levels or reward numbers in the schema', async () => {
    // Enforced structurally: InterpretationSchema's item types simply have
    // no such fields, so a model trying to invent one is dropped by Zod's
    // default (non-strict) parsing rather than ever reaching the caller.
    const provider = fakeProvider([
      JSON.stringify({
        items: [
          {
            kind: 'log',
            summary: 'Deep work',
            activity_class: 'deep work',
            skill: null,
            duration_min: 60,
            intensity: 'moderate',
            distance_km: null,
            pages: null,
            started_text: null,
            stats: [{ code: 'FOC', weight: 1 }],
            matches_daily_id: null,
            confidence: 0.7,
            xp: 9999,
            hp: -50,
          },
        ],
      }),
    ]);
    const result = await interpretNote(provider, 'did deep work', ctx);
    expect(result.interpretation?.items[0]).not.toHaveProperty('xp');
    expect(result.interpretation?.items[0]).not.toHaveProperty('hp');
  });
});
