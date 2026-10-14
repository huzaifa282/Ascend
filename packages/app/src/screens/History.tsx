import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Tabs, TypeTag, XpStrip } from '@ascendant/ui';
import { useProfile } from '../hooks/useProfile';
import { useTitles } from '../hooks/useHistory';
import { useDailyXpSeries } from '../hooks/useHistory';
import { resolveRepos } from '../hooks/useRepos';

type HistoryTab = 'log' | 'calendar' | 'titles';

/** History — spec 10.12. Log and Titles are fully wired; Calendar is a first pass over the XP-per-day series. */
export function History() {
  const [tab, setTab] = useState<HistoryTab>('log');
  const { data: profile } = useProfile();
  const { data: dailyXp } = useDailyXpSeries(profile?.timezone ?? '', 30);
  const { data: titles } = useTitles();

  const { data: activities } = useQuery({
    queryKey: ['activities', 'recent'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const now = Date.now();
      return repos.activities.listBetween(now - 30 * 24 * 60 * 60 * 1000, now);
    },
  });

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

      {tab === 'calendar' && dailyXp && (
        <div className="rounded-lg border border-rule bg-bg p-4">
          <XpStrip dailyXp={dailyXp} />
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
        </div>
      )}
    </div>
  );
}
