import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Tabs, TypeTag, clsx } from '@ascendant/ui';
import { useProfile } from '../hooks/useProfile';
import { useTitles } from '../hooks/useHistory';
import { useCalendarMonth, useDayActivities } from '../hooks/useCalendarMonth';
import { addLocalDays, localDateString, localMidnightMs } from '../lib/localTime';
import { resolveRepos } from '../hooks/useRepos';

type HistoryTab = 'log' | 'calendar' | 'titles';

const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** History — spec 10.12. */
export function History() {
  const [tab, setTab] = useState<HistoryTab>('log');
  const { data: profile } = useProfile();
  const timezone = profile?.timezone ?? '';

  const [monthStart, setMonthStart] = useState(() => {
    const today = timezone ? localDateString(Date.now(), timezone) : new Date().toISOString().slice(0, 10);
    return `${today.slice(0, 7)}-01`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: days } = useCalendarMonth(timezone, monthStart);
  const { data: titles } = useTitles();

  const { data: activities } = useQuery({
    queryKey: ['activities', 'recent'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const now = Date.now();
      return repos.activities.listBetween(now - 30 * 24 * 60 * 60 * 1000, now);
    },
  });

  const selectedBounds = useMemo(() => {
    if (!selectedDate || !timezone) return null;
    return { startMs: localMidnightMs(selectedDate, timezone), endMs: localMidnightMs(addLocalDays(selectedDate, 1), timezone) };
  }, [selectedDate, timezone]);
  const { data: selectedActivities } = useDayActivities(selectedBounds?.startMs ?? 0, selectedBounds?.endMs ?? 0);

  const leadingBlanks =
    days && days.length > 0
      ? (() => {
          const [y, m, d] = days[0]!.date.split('-').map(Number) as [number, number, number];
          return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        })()
      : 0;

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex flex-col gap-6">
      <h1 className="font-display text-[28px] leading-8 font-bold a-heading">History</h1>
      <Tabs
        aria-label="History views"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'log', label: 'Log' },
          { value: 'calendar', label: 'Calendar' },
          { value: 'titles', label: 'Titles' },
        ]}
      />

      {tab === 'log' && (
        <div className="rounded-lg border border-rule bg-bg a-card-clip">
          {(activities ?? [])
            .slice()
            .sort((a, b) => b.startedAt - a.startedAt)
            .map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 a-row">
                <span className="font-mono text-[11px] text-text-muted w-16 flex-none">
                  {new Date(a.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
                <TypeTag kind="log" />
                <span className="font-display text-[14px] flex-1 truncate">{a.title}</span>
                <span className="font-mono text-[12px] text-accent tabular-nums">+{a.xp} XP</span>
              </div>
            ))}
          {(!activities || activities.length === 0) && <p className="text-text-muted p-4">Nothing logged yet.</p>}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted hover:text-text"
              onClick={() => {
                setMonthStart((m) => addLocalDays(m, -1).slice(0, 7) + '-01');
                setSelectedDate(null);
              }}
            >
              &larr; PREV
            </button>
            <span className="font-display text-[15px] font-semibold">
              {MONTH_LABEL.format(new Date(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)) - 1, 1))}
            </span>
            <button
              type="button"
              className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted hover:text-text"
              onClick={() => {
                setMonthStart((m) => addLocalDays(m, 32).slice(0, 7) + '-01');
                setSelectedDate(null);
              }}
            >
              NEXT &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_HEADERS.map((d, i) => (
              <span key={i} className="font-mono text-[10px] uppercase tracking-[.1em] text-text-muted text-center">
                {d}
              </span>
            ))}
            {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
            {(days ?? []).map((day) => {
              const dayNum = Number(day.date.slice(8, 10));
              const selected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={clsx(
                    'flex flex-col items-center gap-0.5 rounded-md border p-2 h-16',
                    selected ? 'border-accent bg-surface' : 'border-rule hover:bg-surface',
                  )}
                >
                  <span className="font-mono text-[11px] text-text-muted">{dayNum}</span>
                  {day.isRestDay ? (
                    <span className="font-mono text-[10px] uppercase tracking-[.1em] text-text-muted">REST</span>
                  ) : day.xp > 0 ? (
                    <span className="font-mono text-[11px] text-accent tabular-nums">+{day.xp}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="rounded-lg border border-rule bg-bg a-card-clip">
              <div className="h-[44px] flex items-center px-4 border-b border-rule">
                <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">{selectedDate}</span>
              </div>
              {(selectedActivities ?? []).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2 a-row">
                  <span className="font-display text-[13px] flex-1 truncate">{a.title}</span>
                  <span className="font-mono text-[11px] text-accent tabular-nums">+{a.xp} XP</span>
                </div>
              ))}
              {(!selectedActivities || selectedActivities.length === 0) && (
                <p className="text-text-muted p-4">Nothing logged that day.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'titles' && (
        <div className="grid grid-cols-2 gap-3">
          {(titles ?? []).map((t) => {
            const earned = t.earnedAt != null;
            return (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-rule bg-bg p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-display text-[15px] font-semibold">{t.name}</span>
                  <span className="font-mono text-[11px] text-text-muted">{t.description}</span>
                </div>
                <Badge tone={earned ? 'ok' : 'muted'}>{earned ? 'EARNED' : 'LOCKED'}</Badge>
              </div>
            );
          })}
          {(!titles || titles.length === 0) && <p className="text-text-muted p-4">No titles yet.</p>}
        </div>
      )}
    </div>
  );
}
