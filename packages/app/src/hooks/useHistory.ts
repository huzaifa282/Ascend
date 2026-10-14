import { useQuery } from '@tanstack/react-query';
import { localDateString, localDayBounds } from '../lib/localTime';
import { resolveRepos } from './useRepos';

/** Daily XP totals for the last `days` local days (oldest first, today last) — feeds XpStrip. */
export function useDailyXpSeries(timezone: string, days = 61) {
  return useQuery({
    queryKey: ['xpSeries', timezone, days],
    enabled: Boolean(timezone),
    queryFn: async () => {
      const repos = await resolveRepos();
      const now = Date.now();
      const { endMs: todayEnd } = localDayBounds(now, timezone);
      const startMs = todayEnd - days * 24 * 60 * 60 * 1000;
      const events = await repos.events.listXpBetween(startMs, todayEnd);

      const byDate = new Map<string, number>();
      for (const e of events) {
        const d = localDateString(e.at, timezone);
        byDate.set(d, (byDate.get(d) ?? 0) + e.amount);
      }

      const series: number[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = localDateString(todayEnd - i * 24 * 60 * 60 * 1000 - 1, timezone);
        series.push(byDate.get(d) ?? 0);
      }
      return series;
    },
  });
}

export function useRecentSystemMessages(limit = 7) {
  return useQuery({
    queryKey: ['systemMessages', limit],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.systemMessages.listRecent(limit);
    },
  });
}

export function useTitles() {
  return useQuery({
    queryKey: ['titles'],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.titles.list();
    },
  });
}
