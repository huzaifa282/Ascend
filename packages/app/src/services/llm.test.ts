import { describe, expect, it, vi } from 'vitest';
import type { Provider } from '@ascendant/llm';
import { createTestServiceContext, seedMinimalProfile } from './testDb';
import { acceptEntryItem, submitEntry } from './llm';

// submitEntry takes an optional providerOverride specifically so tests don't
// have to fight module-mocking to replace createProviderForSettings (which
// itself needs a real Tauri/browser runtime for keychain + settings).
const fakeProvider: Provider = {
  id: 'openai',
  listModels: vi.fn(),
  test: vi.fn(),
  complete: vi.fn(async () => ({
    text: JSON.stringify({
      items: [
        {
          kind: 'log',
          summary: 'Morning run, 5 km',
          activity_class: 'running',
          skill: null,
          duration_min: 30,
          intensity: 'moderate',
          distance_km: 5,
          pages: null,
          started_text: null,
          stats: [{ code: 'END', weight: 1 }],
          matches_daily_id: null,
          confidence: 0.9,
        },
        {
          kind: 'task',
          title: 'Submit the invoice',
          due_text: null,
          difficulty: 2,
          est_minutes: null,
          stats: [{ code: 'DIS', weight: 1 }],
          reminder_minutes: null,
        },
      ],
    }),
    tokensIn: 100,
    tokensOut: 50,
  })),
};

describe('submitEntry + acceptEntryItem (integration)', () => {
  it('writes entry/entry_items for a two-item response, then credits each on accept', async () => {
    const ctx = await createTestServiceContext();
    const now = Date.now();
    await seedMinimalProfile(ctx, now);

    const result = await submitEntry(ctx, 'ran 5k this morning and need to submit the invoice', 'typed', now, fakeProvider);
    expect(result.status).toBe('needs_confirm');
    expect(result.itemIds).toHaveLength(2);

    const entry = await ctx.repos.entries.getById(result.entryId);
    expect(entry?.status).toBe('needs_confirm');
    expect(entry?.tokensIn).toBe(100);

    const items = await ctx.repos.entryItems.listByEntry(result.entryId);
    expect(items.map((i) => i.kind).sort()).toEqual(['log', 'task']);

    for (const item of items) {
      await acceptEntryItem(ctx, item.id, now + 1000);
    }

    const profile = await ctx.repos.profile.get();
    expect(profile!.totalXp).toBeGreaterThan(0);

    const tasks = await ctx.repos.tasks.listOpen();
    expect(tasks.some((t) => t.title === 'Submit the invoice')).toBe(true);

    const updatedItems = await ctx.repos.entryItems.listByEntry(result.entryId);
    expect(updatedItems.every((i) => i.status === 'accepted')).toBe(true);
  });

  it('surfaces a validation error and sets status to error after two failed attempts', async () => {
    const badProvider: Provider = {
      id: 'openai',
      listModels: vi.fn(),
      test: vi.fn(),
      complete: vi.fn(async () => ({ text: 'not json', tokensIn: 10, tokensOut: 5 })),
    };
    const ctx = await createTestServiceContext();
    const now = Date.now();
    await seedMinimalProfile(ctx, now);

    const result = await submitEntry(ctx, 'gibberish note', 'typed', now, badProvider);
    expect(result.status).toBe('error');
    const entry = await ctx.repos.entries.getById(result.entryId);
    expect(entry?.status).toBe('error');
    expect(badProvider.complete).toHaveBeenCalledTimes(2); // one retry, per spec 6.1
  });
});
