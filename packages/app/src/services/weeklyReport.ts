/** Spec 10.13 — the weekly report: five figures, stat gains, a written review. */
import type { StatCode } from '@ascendant/engine';
import { localDateString, localDayBounds } from '../lib/localTime';
import { createProviderForSettings } from './llm';
import type { ServiceContext } from './context';

export interface WeeklyReportStatGain {
  code: StatCode;
  name: string;
  gain: number;
}

export interface WeeklyReport {
  weekLabel: string;
  xpThisWeek: number;
  bestDay: { date: string; xp: number } | null;
  onTimeRatePct: number;
  questsDone: number;
  streakDays: number;
  statGains: WeeklyReportStatGain[];
  summary: string;
  llmParagraph: string | null;
  level: number;
  rank: string;
  titleName: string | null;
}

const DATE_LABEL = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export async function buildWeeklyReport(ctx: ServiceContext, now: number): Promise<WeeklyReport> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('buildWeeklyReport: no profile row');

  const { endMs: todayEnd } = localDayBounds(now, profile.timezone);
  const weekStartMs = todayEnd - 7 * 24 * 60 * 60 * 1000;

  const dailyXp: { date: string; xp: number }[] = [];
  let questsDoneThisWeek = 0;
  for (let i = 6; i >= 0; i--) {
    const dayEnd = todayEnd - i * 24 * 60 * 60 * 1000;
    const dayStart = dayEnd - 24 * 60 * 60 * 1000;
    const events = await ctx.repos.events.listXpBetween(dayStart, dayEnd);
    const date = localDateString(dayEnd - 1, profile.timezone);
    dailyXp.push({ date, xp: events.reduce((sum, e) => sum + e.amount, 0) });
    const completions = await ctx.repos.dailyCompletions.listForDate(date);
    questsDoneThisWeek += completions.length;
  }
  const xpThisWeek = dailyXp.reduce((sum, d) => sum + d.xp, 0);
  const bestDay = dailyXp.reduce<{ date: string; xp: number } | null>(
    (best, d) => (!best || d.xp > best.xp ? d : best),
    null,
  );

  const tasksDoneThisWeek = await ctx.repos.tasks.listCompletedBetween(weekStartMs, now);
  questsDoneThisWeek += tasksDoneThisWeek.filter((t) => t.status === 'done').length;

  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const tasksLast30Days = (await ctx.repos.tasks.listCompletedBetween(thirtyDaysAgo, now)).filter((t) => t.dueAt != null);
  const onTimeCount = tasksLast30Days.filter((t) => t.rewardTier && t.rewardTier !== 'late' && t.rewardTier !== 'failed').length;
  const onTimeRatePct = tasksLast30Days.length > 0 ? Math.round((onTimeCount / tasksLast30Days.length) * 100) : 100;

  const statEventsThisWeek = await ctx.repos.events.listStatBetween(weekStartMs, now);
  const stats = await ctx.repos.stats.list();
  const gainByCode = new Map<string, number>();
  for (const e of statEventsThisWeek) {
    if (e.statXp > 0) gainByCode.set(e.statCode, (gainByCode.get(e.statCode) ?? 0) + e.statXp);
  }
  const statGains: WeeklyReportStatGain[] = Array.from(gainByCode.entries())
    .map(([code, gain]) => ({ code: code as StatCode, name: stats.find((s) => s.code === code)?.name ?? code, gain }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 5);

  const titles = await ctx.repos.titles.list();
  const titleRow = profile.equippedTitleId ? titles.find((t) => t.id === profile.equippedTitleId) : undefined;

  const weekStartLabel = DATE_LABEL.format(new Date(weekStartMs));
  const weekEndLabel = DATE_LABEL.format(new Date(todayEnd - 1));
  const weekLabel = `${weekStartLabel.toUpperCase()} - ${weekEndLabel.toUpperCase()}`;

  const topStat = statGains[0];
  const summary = `This week: ${xpThisWeek} XP, ${questsDoneThisWeek} quests done, a ${onTimeRatePct}% on-time rate. ${
    topStat ? `${topStat.name} grew the most (+${topStat.gain} XP). ` : ''
  }${
    profile.streakDays > 0 ? `The streak is at ${profile.streakDays} day${profile.streakDays === 1 ? '' : 's'}.` : ''
  }`.trim();

  let llmParagraph: string | null = null;
  const provider = await createProviderForSettings(ctx);
  if (provider) {
    try {
      const result = await provider.complete({
        system: 'You write one short, plain, encouraging-but-honest paragraph (2-3 sentences) summarizing a week of self-tracked progress in a life-RPG app, plus one concrete suggestion for next week. No emoji, no exclamation marks unless truly earned.',
        messages: [
          {
            role: 'user',
            content: `Week ${weekLabel}: ${xpThisWeek} XP, ${questsDoneThisWeek} quests done, ${onTimeRatePct}% on-time rate, streak ${profile.streakDays} days. Top stat gains: ${statGains.map((s) => `${s.name} +${s.gain}`).join(', ') || 'none'}.`,
          },
        ],
        maxTokens: 200,
      });
      llmParagraph = result.text;
    } catch {
      llmParagraph = null; // best-effort — the template summary above always renders regardless.
    }
  }

  return {
    weekLabel,
    xpThisWeek,
    bestDay,
    onTimeRatePct,
    questsDone: questsDoneThisWeek,
    streakDays: profile.streakDays,
    statGains,
    summary,
    llmParagraph,
    level: profile.level,
    rank: profile.rank,
    titleName: titleRow?.name ?? null,
  };
}
