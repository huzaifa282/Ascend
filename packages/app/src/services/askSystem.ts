/** Spec 6.6 — "Ask the System" chat: a compact summary, answered in the chosen tone. */
import { newId, schema } from '@ascendant/db';
import { statTodayGain } from '@ascendant/engine';
import { buildAskSystemContext, buildAskSystemPrompt, type AskSystemSummary, type Tone } from '@ascendant/llm';
import { localDateString, localDayBounds, localMidnightMs } from '../lib/localTime';
import { createProviderForSettings } from './llm';
import type { ServiceContext } from './context';

export async function buildAskSystemSummary(ctx: ServiceContext, now: number): Promise<AskSystemSummary> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('buildAskSystemSummary: no profile row');

  const [stats, tasks, dailies] = await Promise.all([
    ctx.repos.stats.list(),
    ctx.repos.tasks.listOpen(),
    ctx.repos.dailies.listActive(),
  ]);

  const { startMs: todayStart, endMs: todayEnd } = localDayBounds(now, profile.timezone);
  const todayEvents = await ctx.repos.events.listXpBetween(todayStart, todayEnd);
  const xpToday = todayEvents.reduce((sum, e) => sum + e.amount, 0);

  const last14DaysXp: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayEnd = todayEnd - i * 24 * 60 * 60 * 1000;
    const dayStart = dayEnd - 24 * 60 * 60 * 1000;
    const events = await ctx.repos.events.listXpBetween(dayStart, dayEnd);
    last14DaysXp.push(events.reduce((sum, e) => sum + e.amount, 0));
  }

  const sevenDaysAgo = localMidnightMs(
    localDateString(now - 7 * 24 * 60 * 60 * 1000, profile.timezone),
    profile.timezone,
  );
  const statEventsLast7Days = await ctx.repos.events.listStatBetween(sevenDaysAgo, now);
  const statGainByCode = new Map<string, number>();
  for (const e of statEventsLast7Days) {
    statGainByCode.set(e.statCode, (statGainByCode.get(e.statCode) ?? 0) + e.statXp);
  }

  const today = localDateString(now, profile.timezone);
  const completions = await ctx.repos.dailyCompletions.listForDate(today);

  return {
    level: profile.level,
    rank: profile.rank,
    hp: profile.hp,
    streakDays: profile.streakDays,
    xpToday,
    last14DaysXp,
    stats: stats
      .filter((s) => !s.hidden)
      .map((s) => ({
        code: s.code,
        value: s.value,
        sevenDayGain: statTodayGain(s.statXp, Math.max(0, s.statXp - (statGainByCode.get(s.code) ?? 0)), ctx.ruleset),
      })),
    openTasks: tasks.map((t) => ({ title: t.title, dueLocal: t.dueAt ? new Date(t.dueAt).toLocaleString() : null })),
    dailiesDoneToday: new Set(completions.map((c) => c.dailyId)).size,
    dailiesTotal: dailies.length,
  };
}

export async function askSystem(ctx: ServiceContext, question: string, now: number): Promise<string> {
  const provider = await createProviderForSettings(ctx);
  const profile = await ctx.repos.profile.get();
  const tone = (profile?.tone ?? 'neutral') as Tone;

  await ctx.repos.chatMessages.create({ id: newId(), createdAt: now, updatedAt: now, role: 'user', text: question, at: now });

  if (!provider) {
    const fallback = "I need a connected model to answer that — connect one in Settings > Model, or check the Status page for the numbers directly.";
    await ctx.db.insert(schema.chatMessages).values({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      role: 'assistant',
      text: fallback,
      at: now,
    });
    return fallback;
  }

  const summary = await buildAskSystemSummary(ctx, now);
  const result = await provider.complete({
    system: buildAskSystemPrompt(tone),
    messages: [{ role: 'user', content: `${buildAskSystemContext(summary)}\n\nQuestion: ${question}` }],
    maxTokens: 300,
  });

  await ctx.db.insert(schema.chatMessages).values({
    id: newId(),
    createdAt: now,
    updatedAt: now,
    role: 'assistant',
    text: result.text,
    at: now,
  });
  return result.text;
}
