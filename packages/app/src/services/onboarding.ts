/**
 * Spec 10.1 — a brand-new install has no profile/settings/stats rows at
 * all (only the seed generator created them before this). `bootstrapProfile`
 * creates all three, idempotently, as soon as onboarding starts — not at
 * the end — so later steps (the model connection step reuses the ordinary
 * Settings > Model panel) have a real settings row to persist into.
 */
import { newId, runAtomic, schema } from '@ascendant/db';
import { STAT_CODES, type StatCode } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import type { ServiceContext } from './context';
import { STAT_NAMES, TITLE_DEFS, type SuggestedDaily } from '../onboarding/baselines';
import { DEFAULT_SETTINGS } from '../settings/schema';
import { localDateString } from '../lib/localTime';
import { buildStatEvent } from './ledger';

function statValueFor(statXp: number, statScale: number): number {
  return Math.min(99, Math.floor(100 * (1 - Math.exp(-Math.max(0, statXp) / statScale))));
}

export async function bootstrapProfile(ctx: ServiceContext, now: number): Promise<string> {
  const existing = await ctx.repos.profile.get();
  if (existing) return existing.id;

  const profileId = newId();
  await ctx.repos.profile.create({
    id: profileId,
    createdAt: now,
    updatedAt: now,
    name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tone: 'neutral',
    levelingEnabled: true,
    level: 1,
    xpIntoLevel: 0,
    totalXp: 0,
    rank: 'E',
    hp: 100,
    equippedTitleId: null,
    streakDays: 0,
    streakFrozenUntil: null,
    penaltyZoneSince: null,
    onboardingDone: false,
    lastDayCloseDate: null,
  });

  await ctx.repos.settings.create({
    id: newId(),
    createdAt: now,
    updatedAt: now,
    model: DEFAULT_SETTINGS.model,
    voice: DEFAULT_SETTINGS.voice,
    notifications: DEFAULT_SETTINGS.notifications,
    quietHours: DEFAULT_SETTINGS.quietHours,
    widget: DEFAULT_SETTINGS.widget,
    music: DEFAULT_SETTINGS.music,
    timer: DEFAULT_SETTINGS.timer,
    appearance: DEFAULT_SETTINGS.appearance,
    dataSharing: DEFAULT_SETTINGS.dataSharing,
    rulesetOverrides: null,
    hotkey: DEFAULT_SETTINGS.hotkey,
  });

  for (const code of STAT_CODES) {
    const def = STAT_NAMES[code];
    await ctx.repos.stats.create({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      code,
      name: def.name,
      sort: def.sort,
      hidden: false,
      statXp: 0,
      value: 0,
      lastTrainedAt: null,
    });
  }

  await ctx.repos.titles.createMany(
    TITLE_DEFS.map((def) => ({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      key: def.key,
      name: def.name,
      description: def.description,
      rule: def.rule,
      earnedAt: null,
    })),
  );

  return profileId;
}

export async function applyStatBaselines(
  ctx: ServiceContext,
  statXpByCode: Partial<Record<StatCode, number>>,
  now: number,
): Promise<void> {
  const writes: unknown[] = [];
  for (const [code, statXp] of Object.entries(statXpByCode) as [StatCode, number][]) {
    if (statXp === 0) continue;
    const row = await ctx.repos.stats.getByCode(code);
    if (!row) continue;
    writes.push(
      buildStatEvent(ctx.db, { at: now, statCode: code, statXp, refType: 'onboarding' }),
      ctx.db
        .update(schema.stats)
        .set({ statXp, value: statValueFor(statXp, ctx.ruleset.stats.statScale), updatedAt: now })
        .where(eq(schema.stats.id, row.id)),
    );
  }
  if (writes.length > 0) await runAtomic(ctx.sql, writes as Parameters<typeof runAtomic>[1]);
}

export async function setProfileNameToneAndFinish(
  ctx: ServiceContext,
  input: { name: string; tone: 'strict' | 'neutral' | 'encouraging'; now: number },
): Promise<void> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('setProfileNameToneAndFinish: no profile row');
  await ctx.repos.profile.update(profile.id, {
    name: input.name,
    tone: input.tone,
    onboardingDone: true,
    lastDayCloseDate: localDateString(input.now, profile.timezone),
    updatedAt: input.now,
  });
}

export async function createSuggestedDailies(ctx: ServiceContext, dailies: SuggestedDaily[], now: number): Promise<void> {
  for (const [i, daily] of dailies.entries()) {
    await ctx.repos.dailies.create({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      title: daily.title,
      statWeights: daily.statWeights,
      xp: daily.xp,
      recurrence: { type: 'daily' },
      active: true,
      sort: i,
    });
  }
}
