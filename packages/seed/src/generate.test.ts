import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { schema } from '@ascendant/db';
import { recalculate } from '@ascendant/engine';
import { createNodeDb } from './nodeDb';
import { buildSeedContext, generateSeed } from './generate';

/**
 * Phase 2 acceptance check (spec 14 / the build plan): "the seeded profile
 * reaches about level 23, rank D, HP 70 and streak 18, and `recalculate`
 * matches the cached totals exactly."
 */
describe('generateSeed', () => {
  it('produces a profile in the spec-described range and reproduces exactly under recalculate()', async () => {
    const { db, sql } = await createNodeDb();
    const ctx = await buildSeedContext(db, sql);

    await generateSeed(ctx, { now: Date.UTC(2026, 9, 14, 12, 0, 0) });

    const profile = await ctx.repos.profile.get();
    expect(profile).toBeDefined();
    expect(profile!.name).toBe('Alex');
    expect(profile!.rank).toBe('D');
    expect(profile!.level).toBeGreaterThanOrEqual(18);
    expect(profile!.level).toBeLessThanOrEqual(26);
    expect(profile!.hp).toBeGreaterThanOrEqual(40);
    expect(profile!.hp).toBeLessThanOrEqual(100);
    expect(profile!.streakDays).toBeGreaterThanOrEqual(14);

    const ledger = await ctx.repos.events.loadFullLedger();
    const recalculated = recalculate(ledger, ctx.ruleset);
    expect(recalculated.level).toBe(profile!.level);
    expect(recalculated.xpIntoLevel).toBe(profile!.xpIntoLevel);
    expect(recalculated.totalXp).toBe(profile!.totalXp);
  });

  it('is deterministic for a given seed and anchor time', async () => {
    const now = Date.UTC(2026, 9, 14, 12, 0, 0);

    const a = await createNodeDb();
    const ctxA = await buildSeedContext(a.db, a.sql);
    await generateSeed(ctxA, { now });

    const b = await createNodeDb();
    const ctxB = await buildSeedContext(b.db, b.sql);
    await generateSeed(ctxB, { now });

    const profileA = await ctxA.repos.profile.get();
    const profileB = await ctxB.repos.profile.get();
    expect(profileA!.level).toBe(profileB!.level);
    expect(profileA!.totalXp).toBe(profileB!.totalXp);
    expect(profileA!.hp).toBe(profileB!.hp);
    expect(profileA!.streakDays).toBe(profileB!.streakDays);
  });

  it('seeds the five dailies, the eight titles, and the fictional music tracks', async () => {
    const { db, sql } = await createNodeDb();
    const ctx = await buildSeedContext(db, sql);
    await generateSeed(ctx, { now: Date.UTC(2026, 9, 14, 12, 0, 0) });

    const dailies = await ctx.repos.dailies.listAll();
    expect(dailies).toHaveLength(5);

    const titles = await ctx.repos.titles.list();
    expect(titles).toHaveLength(8);
    const earned = titles.filter((t) => t.earnedAt != null);
    expect(earned.map((t) => t.key).sort()).toEqual(['early_riser', 'first_light']);

    const tracks = await ctx.repos.musicTracks.list();
    expect(tracks).toHaveLength(5);

    const skills = await ctx.repos.skills.list();
    expect(skills.length).toBe(6);
    expect(skills.some((s) => s.xp > 0)).toBe(true);
  });

  it('leaves one task genuinely failed and today\'s named tasks open', async () => {
    const { db, sql } = await createNodeDb();
    const ctx = await buildSeedContext(db, sql);
    await generateSeed(ctx, { now: Date.UTC(2026, 9, 14, 12, 0, 0) });

    const failed = await db.select().from(schema.tasks).where(eq(schema.tasks.status, 'failed'));
    expect(failed.length).toBeGreaterThanOrEqual(1);

    const open = await ctx.repos.tasks.listOpen();
    expect(open.some((t) => t.title === 'Pay the hosting invoice')).toBe(true);
    expect(open.some((t) => t.title === 'Call the dentist')).toBe(true);
  });
});
