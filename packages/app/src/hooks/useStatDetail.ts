import { useQuery } from '@tanstack/react-query';
import { statValue, type StatCode } from '@ascendant/engine';
import { createServiceContext } from '../services';
import { localDateString } from '../lib/localTime';

export interface StatDetailPoint {
  date: string;
  value: number;
}

export interface StatContributor {
  label: string;
  statXp: number;
  pct: number;
}

export interface StatRecentEntry {
  at: number;
  label: string;
  statXp: number;
}

export interface StatDetail {
  value: number;
  todayGain: number;
  changeOverRange: number;
  series: StatDetailPoint[];
  contributors: StatContributor[];
  recent: StatRecentEntry[];
  daysSinceTrained: number | null;
}

/** Stat detail — spec 10.10. Rebuilds the value-over-time series from the stat_events ledger. */
export function useStatDetail(code: StatCode, rangeDays: 30 | 90 | 365) {
  return useQuery({
    queryKey: ['statDetail', code, rangeDays],
    queryFn: async (): Promise<StatDetail> => {
      const ctx = await createServiceContext();
      const [statRow, ledger] = await Promise.all([ctx.repos.stats.getByCode(code), ctx.repos.events.loadFullLedger()]);
      const timezone = (await ctx.repos.profile.get())?.timezone ?? 'UTC';
      const now = Date.now();

      const events = ledger.statEvents.filter((e) => e.statCode === code).sort((a, b) => a.atMs - b.atMs);

      const rangeStartMs = now - rangeDays * 24 * 60 * 60 * 1000;
      let cumBeforeRange = 0;
      for (const e of events) {
        if (e.atMs < rangeStartMs) cumBeforeRange += e.statXp;
      }

      const byDate = new Map<string, number>();
      for (const e of events) {
        if (e.atMs < rangeStartMs) continue;
        const d = localDateString(e.atMs, timezone);
        byDate.set(d, (byDate.get(d) ?? 0) + e.statXp);
      }

      const series: StatDetailPoint[] = [];
      let cum = cumBeforeRange;
      for (let i = rangeDays - 1; i >= 0; i--) {
        const d = localDateString(now - i * 24 * 60 * 60 * 1000, timezone);
        cum += byDate.get(d) ?? 0;
        series.push({ date: d, value: statValue(cum, ctx.ruleset) });
      }

      const today = localDateString(now, timezone);
      const todayGain = byDate.get(today) ?? 0;
      const changeOverRange = (series.at(-1)?.value ?? 0) - (series[0]?.value ?? 0);

      const contributorsByRef = new Map<string, number>();
      const activityTitleCache = new Map<string, string>();
      // The engine-shaped ledger has no refType/refId, so contributors and
      // recent entries are computed from the raw rows instead.
      const rawEvents = await ctx.repos.events.listStatBetween(rangeStartMs, now);
      for (const e of rawEvents) {
        if (e.statCode !== code || e.statXp <= 0) continue;
        let label = e.refType ?? 'other';
        if (e.refType === 'activity' && e.refId) {
          if (!activityTitleCache.has(e.refId)) {
            const activity = await ctx.repos.activities.getById(e.refId);
            activityTitleCache.set(e.refId, activity?.title ?? 'Activity');
          }
          label = activityTitleCache.get(e.refId)!;
        } else if (e.refType === 'task') {
          label = 'Tasks';
        }
        contributorsByRef.set(label, (contributorsByRef.get(label) ?? 0) + e.statXp);
      }
      const totalContrib = Array.from(contributorsByRef.values()).reduce((a, b) => a + b, 0) || 1;
      const contributors: StatContributor[] = Array.from(contributorsByRef.entries())
        .map(([label, statXp]) => ({ label, statXp, pct: Math.round((statXp / totalContrib) * 100) }))
        .sort((a, b) => b.statXp - a.statXp)
        .slice(0, 5);

      const recentRaw = rawEvents
        .filter((e) => e.statCode === code)
        .sort((a, b) => b.at - a.at)
        .slice(0, 10);
      const recent: StatRecentEntry[] = [];
      for (const e of recentRaw) {
        let label = e.refType ?? 'Event';
        if (e.refType === 'activity' && e.refId) {
          if (!activityTitleCache.has(e.refId)) {
            const activity = await ctx.repos.activities.getById(e.refId);
            activityTitleCache.set(e.refId, activity?.title ?? 'Activity');
          }
          label = activityTitleCache.get(e.refId)!;
        } else if (e.refType === 'task') {
          label = 'Task completed';
        } else if (e.refType === 'decay') {
          label = 'Neglect decay';
        }
        recent.push({ at: e.at, label, statXp: e.statXp });
      }

      const daysSinceTrained = statRow?.lastTrainedAt
        ? Math.floor((now - statRow.lastTrainedAt) / (24 * 60 * 60 * 1000))
        : null;

      return {
        value: statRow?.value ?? 0,
        todayGain,
        changeOverRange,
        series,
        contributors,
        recent,
        daysSinceTrained,
      };
    },
  });
}
