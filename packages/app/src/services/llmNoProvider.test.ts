import { describe, expect, it } from 'vitest';
import { createTestServiceContext, seedMinimalProfile } from './testDb';
import { submitEntry } from './llm';

// No `vi.mock` here, deliberately: this exercises createProviderForSettings'
// real logic, which returns null when the settings row has no model
// configured — exactly the "offline or no model" path in spec 6.1.
describe('submitEntry with no provider configured', () => {
  it('queues the entry without interpreting it', async () => {
    const ctx = await createTestServiceContext();
    const now = Date.now();
    await seedMinimalProfile(ctx, now);
    // No settings row at all, so createProviderForSettings naturally
    // resolves to null — the same as a fresh profile before onboarding.

    const result = await submitEntry(ctx, 'went for a walk', 'typed', now);
    expect(result.status).toBe('queued');
    expect(result.itemIds).toHaveLength(0);

    const entry = await ctx.repos.entries.getById(result.entryId);
    expect(entry?.status).toBe('queued');
    expect(entry?.rawText).toBe('went for a walk');
  });
});
