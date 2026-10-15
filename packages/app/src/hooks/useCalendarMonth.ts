import { useQuery } from '@tanstack/react-query';
import { addLocalDays, localDateString, localMidnightMs, localMonthString } from '../lib/localTime';
import { resolveRepos } from './useRepos';

export interface CalendarDay {
  date: string;
  xp: number;
  isRestDay: boolean;
}

/** One calendar month's per-day XP (and shield/"REST" days) for History > Calendar (spec 10.12). */
export function useCalendarMonth(timezone: string, monthStart: string /* 'YYYY-MM-01' */) {
  return useQuery({
    queryKey: ['calendarMonth', timezone, monthStart],
    enabled: Boolean(timezone),
    queryFn: async (): Promise<CalendarDay[]> => {
      const repos = await resolveRepos();
      const month = localMonthString(monthStart);
      const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
      const monthEnd = addLocalDays(monthStart, daysInMonth - 1);

      const startMs = localMidnightMs(monthStart, timezone);
      const endMs = localMidnightMs(addLocalDays(monthEnd, 1), timezone);
      const [events, shieldRows] = await Promise.all([
        repos.events.listXpBetween(startMs, endMs),
        repos.shields.listForMonth(month),
      ]);

      const xpByDate = new Map<string, number>();
      for (const e of events) {
        const d = localDateString(e.at, timezone);
        xpByDate.set(d, (xpByDate.get(d) ?? 0) + e.amount);
      }
      const restDays = new Set(shieldRows.map((s) => s.usedOn));

      const days: CalendarDay[] = [];
      for (let i = 0; i < daysInMonth; i++) {
        const date = addLocalDays(monthStart, i);
        days.push({ date, xp: xpByDate.get(date) ?? 0, isRestDay: restDays.has(date) });
      }
      return days;
    },
  });
}

export function useDayActivities(startMs: number, endMs: number) {
  return useQuery({
    queryKey: ['activities', 'day', startMs, endMs],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.activities.listBetween(startMs, endMs);
    },
  });
}
