/**
 * `pnpm seed` — generates the demo profile into a throwaway in-memory
 * sql.js database and prints a summary, so the 60-day simulation can be
 * verified without a full Tauri session (spec 14 / phase 2's acceptance
 * check: "the seeded profile reaches about level 23, rank D, HP 70 and
 * streak 18").
 */
import { recalculate } from '@ascendant/engine';
import { createNodeDb } from './nodeDb';
import { buildSeedContext, generateSeed } from './generate';

async function main() {
  const { db, sql } = await createNodeDb();
  const ctx = await buildSeedContext(db, sql);

  const result = await generateSeed(ctx);
  const profile = await ctx.repos.profile.get();
  const stats = await ctx.repos.stats.list();
  const shieldsUsed = await ctx.repos.shields.listForMonth(
    new Date().toISOString().slice(0, 7),
  );

  console.log(`Seeded profile ${result.profileId} over ${result.daysSimulated} days.\n`);
  console.log('Profile:', {
    name: profile?.name,
    level: profile?.level,
    xpIntoLevel: profile?.xpIntoLevel,
    totalXp: profile?.totalXp,
    rank: profile?.rank,
    hp: profile?.hp,
    streakDays: profile?.streakDays,
  });
  console.log(
    'Stats:',
    stats.map((s) => `${s.code}=${s.value}`).join(' '),
  );
  console.log('Shields used this calendar month:', shieldsUsed.length);

  const ledger = await ctx.repos.events.loadFullLedger();
  const recalculated = recalculate(ledger, ctx.ruleset);
  const matches = recalculated.level === profile?.level && recalculated.xpIntoLevel === profile?.xpIntoLevel;
  console.log('\nrecalculate() reproduces cached totals:', matches ? 'YES' : 'NO (mismatch!)');
  if (!matches) {
    console.log('  recalculated:', recalculated.level, recalculated.xpIntoLevel, recalculated.totalXp);
    console.log('  cached:      ', profile?.level, profile?.xpIntoLevel, profile?.totalXp);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
