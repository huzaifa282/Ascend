/**
 * Spec 6.1 — wires the LLM package's pure pipeline to the database: builds
 * context, calls the provider, validates, and post-processes (6.5) into
 * entries/entry_items rows ready for the confirm card. Accepting an item
 * dispatches to the same phase-2 services real user actions use
 * (logActivity/completeTask/rescheduleTask/completeDaily), so an
 * LLM-sourced item and a hand-typed one are credited identically.
 */
import { newId, schema, type EntryItemRow } from '@ascendant/db';
import {
  checkPlausibility,
  DEFAULT_RULESET,
  type StatCode,
  type StatWeights,
} from '@ascendant/engine';
import {
  createProvider,
  interpretNote,
  matchDaily,
  resolveTimeText,
  type InterpretContext,
  type InterpretationItem,
  type Provider,
} from '@ascendant/llm';
import { eq } from 'drizzle-orm';
import { localDateString } from '../lib/localTime';
import { getPlatform } from '../platform';
import type { ModelProvider } from '../settings/schema';
import type { ServiceContext } from './context';
import { completeDaily } from './completeDaily';
import { completeTask } from './completeTask';
import { logActivity } from './logActivity';
import { checkPenaltyZoneRecovery } from './penaltyZone';
import { rescheduleTask } from './rescheduleTask';

export async function createProviderForSettings(ctx: ServiceContext): Promise<Provider | null> {
  const settingsRow = await ctx.repos.settings.get();
  const model = settingsRow?.model as { provider: ModelProvider | null; model: string | null } | undefined;
  if (!model?.provider || !model.model) return null;

  const platform = await getPlatform();
  const apiKey = await platform.keychain.get(model.provider);
  if (!apiKey && model.provider !== 'ollama' && model.provider !== 'lmstudio') return null;

  return createProvider(model.provider, { apiKey, model: model.model, fetchImpl: platform.fetch });
}

export async function buildInterpretContext(ctx: ServiceContext, now: number): Promise<InterpretContext> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('buildInterpretContext: no profile row');

  const [stats, dailies, tasks, skills] = await Promise.all([
    ctx.repos.stats.list(),
    ctx.repos.dailies.listActive(),
    ctx.repos.tasks.listOpen(),
    ctx.repos.skills.list(),
  ]);

  const nowDate = new Date(now);
  return {
    localDate: localDateString(now, profile.timezone),
    weekday: nowDate.toLocaleDateString(undefined, { weekday: 'long' }),
    localTime: nowDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    timezone: profile.timezone,
    stats: stats.filter((s) => !s.hidden).map((s) => ({ code: s.code, name: s.name, description: '' })),
    activeDailies: dailies.map((d) => ({ id: d.id, title: d.title, statCodes: Object.keys(d.statWeights ?? {}) })),
    openTasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueLocal: t.dueAt ? new Date(t.dueAt).toLocaleString() : null,
    })),
    knownSkills: skills
      .sort((a, b) => (b.lastTrainedAt ?? 0) - (a.lastTrainedAt ?? 0))
      .slice(0, 50)
      .map((s) => ({ name: s.name, statCodes: s.statCodes })),
  };
}

export interface SubmitEntryResult {
  entryId: string;
  status: 'queued' | 'needs_confirm' | 'error';
  itemIds: string[];
  error?: string;
}

/**
 * Spec 6.1 steps 1-4. Offline/no provider: the entry stays `queued` (the
 * manual quick-pick handles it instead). `providerOverride` exists only for
 * tests — real callers resolve the provider from Settings/the keychain.
 */
export async function submitEntry(
  ctx: ServiceContext,
  rawText: string,
  source: 'typed' | 'voice' | 'widget' | 'manual',
  now: number,
  providerOverride?: Provider | null,
): Promise<SubmitEntryResult> {
  const entryId = newId();
  const provider = providerOverride !== undefined ? providerOverride : await createProviderForSettings(ctx);

  if (!provider) {
    await ctx.repos.entries.create({
      id: entryId,
      createdAt: now,
      updatedAt: now,
      rawText,
      source,
      status: 'queued',
      error: null,
      model: null,
      tokensIn: 0,
      tokensOut: 0,
    });
    return { entryId, status: 'queued', itemIds: [] };
  }

  await ctx.repos.entries.create({
    id: entryId,
    createdAt: now,
    updatedAt: now,
    rawText,
    source,
    status: 'interpreting',
    error: null,
    model: null,
    tokensIn: 0,
    tokensOut: 0,
  });

  const context = await buildInterpretContext(ctx, now);
  const result = await interpretNote(provider, rawText, context);

  if (!result.ok || !result.interpretation) {
    await ctx.repos.entries.update(entryId, {
      status: 'error',
      error: result.error ?? 'Unknown error.',
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      updatedAt: now,
    });
    return { entryId, status: 'error', itemIds: [], error: result.error };
  }

  const profile = await ctx.repos.profile.get();
  const dailies = await ctx.repos.dailies.listActive();
  const todaysCompletions = profile
    ? await ctx.repos.dailyCompletions.listForDate(localDateString(now, profile.timezone))
    : [];
  const doneDailyIds = new Set(todaysCompletions.map((c) => c.dailyId));

  const itemIds: string[] = [];
  const rows = result.interpretation.items.map((item) => {
    const id = newId();
    itemIds.push(id);
    return buildEntryItemRow(id, entryId, item, now, dailies, doneDailyIds);
  });
  if (rows.length > 0) {
    await ctx.db.insert(schema.entryItems).values(rows);
  }

  await ctx.repos.entries.update(entryId, {
    status: 'needs_confirm',
    model: provider.id,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    updatedAt: now,
  });

  return { entryId, status: 'needs_confirm', itemIds };
}

function buildEntryItemRow(
  id: string,
  entryId: string,
  item: InterpretationItem,
  now: number,
  dailies: Array<{ id: string; title: string }>,
  doneDailyIds: Set<string>,
) {
  let plausibility: 'ok' | 'flagged' | 'confirmed' = 'ok';
  let resolvedPayload: Record<string, unknown> = { ...item };

  if (item.kind === 'log') {
    // This check only decides the flag shown in the confirm card (using the
    // default ruleset, since per-item post-processing has no profile-scoped
    // override context yet); the real XP multiplier is computed again from
    // ctx.ruleset inside logActivity() at accept time.
    const plausCheck = checkPlausibility(
      {
        activityClass: item.activity_class,
        durationMin: item.duration_min ?? 0,
        distanceKm: item.distance_km,
        pages: item.pages,
        xp: item.duration_min ? 1 : 0,
        totalLoggedTodayMinutes: item.duration_min ?? 0,
      },
      DEFAULT_RULESET,
    );
    plausibility = plausCheck.flagged ? 'flagged' : 'ok';

    const resolvedStart = item.started_text ? resolveTimeText(item.started_text, new Date(now)) : null;
    const match = matchDaily(
      item.summary,
      item.matches_daily_id,
      dailies.map((d) => ({ id: d.id, title: d.title, doneToday: doneDailyIds.has(d.id) })),
    );
    resolvedPayload = {
      ...item,
      resolvedStartedAt: resolvedStart?.date?.getTime() ?? null,
      startAmbiguous: resolvedStart?.ambiguous ?? false,
      ambiguousOptions: resolvedStart?.ambiguousOptions?.map((d) => d.getTime()) ?? null,
      plausibilityReasons: plausCheck.reasons,
      dailyMatch: match,
    };
  } else if (item.kind === 'task') {
    const resolvedDue = item.due_text ? resolveTimeText(item.due_text, new Date(now)) : null;
    resolvedPayload = {
      ...item,
      resolvedDueAt: resolvedDue?.date?.getTime() ?? null,
      dueAmbiguous: resolvedDue?.ambiguous ?? false,
      ambiguousOptions: resolvedDue?.ambiguousOptions?.map((d) => d.getTime()) ?? null,
    };
  } else if (item.kind === 'reschedule') {
    const resolvedDue = resolveTimeText(item.due_text, new Date(now));
    resolvedPayload = {
      ...item,
      resolvedDueAt: resolvedDue.date?.getTime() ?? null,
      dueAmbiguous: resolvedDue.ambiguous,
      ambiguousOptions: resolvedDue.ambiguousOptions?.map((d) => d.getTime()) ?? null,
    };
  }

  return {
    id,
    createdAt: now,
    updatedAt: now,
    entryId,
    kind: item.kind,
    payload: resolvedPayload,
    status: 'pending' as const,
    plausibility,
    resolvedXp: null,
  };
}

function weightsToStatWeights(weights: Array<{ code: StatCode; weight: number }>): StatWeights {
  const out: StatWeights = {};
  for (const w of weights) out[w.code] = w.weight;
  return out;
}

/** Accepts a single pending entry_item, crediting it through the normal services. */
export interface AcceptEntryItemResult {
  levelsGained: number;
  newLevel: number;
  recoveryCleared: boolean;
}

export async function acceptEntryItem(ctx: ServiceContext, itemId: string, now: number): Promise<AcceptEntryItemResult> {
  const item = await ctx.repos.entryItems.getById(itemId);
  if (!item) throw new Error(`acceptEntryItem: item ${itemId} not found`);
  const payload = item.payload as Record<string, unknown>;

  let levelsGained = 0;
  let newLevel = 0;

  switch (item.kind) {
    case 'log': {
      const logResult = await logActivity(ctx, {
        title: String(payload.summary),
        activityClass: String(payload.activity_class),
        durationMin: Number(payload.duration_min ?? 0),
        intensity: payload.intensity as 'light' | 'moderate' | 'hard',
        distanceKm: (payload.distance_km as number | null) ?? null,
        pages: (payload.pages as number | null) ?? null,
        statWeights: weightsToStatWeights((payload.stats as Array<{ code: StatCode; weight: number }>) ?? []),
        entryItemId: itemId,
        startedAt: (payload.resolvedStartedAt as number | null) ?? now,
        plausibilityOverride: 'confirmed',
        now,
      });
      levelsGained = logResult.levelsGained;
      newLevel = logResult.newLevel;
      if ((payload.dailyMatch as { dailyId: string } | null)?.dailyId) {
        const dailyResult = await completeDaily(ctx, (payload.dailyMatch as { dailyId: string }).dailyId, now);
        if (dailyResult.levelsGained > levelsGained) {
          levelsGained = dailyResult.levelsGained;
          newLevel = dailyResult.newLevel;
        }
      }
      break;
    }
    case 'task': {
      await ctx.repos.tasks.create({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        title: String(payload.title),
        notes: null,
        dueAt: (payload.resolvedDueAt as number | null) ?? null,
        windowStart: now,
        difficulty: Number(payload.difficulty ?? 3),
        estMinutes: (payload.est_minutes as number | null) ?? null,
        statWeights: weightsToStatWeights((payload.stats as Array<{ code: StatCode; weight: number }>) ?? [{ code: 'DIS' as StatCode, weight: 1 }]),
        reminderMinutes: (payload.reminder_minutes as number[] | null) ?? null,
        status: 'open',
        completedAt: null,
        rewardTier: null,
        xpAwarded: null,
        rescheduleCount: 0,
        mainQuestId: null,
        emergency: false,
        expiresAt: null,
      });
      break;
    }
    case 'reschedule': {
      await rescheduleTask(ctx, String(payload.task_id), (payload.resolvedDueAt as number) ?? now, now);
      break;
    }
    case 'complete_task': {
      const taskResult = await completeTask(ctx, String(payload.task_id), now);
      levelsGained = taskResult.levelsGained;
      newLevel = taskResult.newLevel;
      break;
    }
    case 'question':
      break; // answered inline (spec 6.5), never "accepted" like the others
  }

  await ctx.repos.entryItems.update(itemId, { status: 'accepted', updatedAt: now });
  const recovery = await checkPenaltyZoneRecovery(ctx, now);
  return { levelsGained, newLevel, recoveryCleared: recovery.cleared };
}

export async function removeEntryItem(ctx: ServiceContext, itemId: string, now: number): Promise<void> {
  await ctx.repos.entryItems.update(itemId, { status: 'removed', updatedAt: now });
}

export async function discardEntry(ctx: ServiceContext, entryId: string, now: number): Promise<void> {
  await ctx.db.update(schema.entries).set({ status: 'discarded', updatedAt: now }).where(eq(schema.entries.id, entryId));
}

export type { EntryItemRow };
