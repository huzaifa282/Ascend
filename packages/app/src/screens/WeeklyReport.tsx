import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, RankBadge } from '@ascendant/ui';
import { useWeeklyReport } from '../hooks';
import { exportShareCardPng } from '../lib/exportShareCard';

/** Weekly report and share card — spec 10.13. */
export function WeeklyReport() {
  const navigate = useNavigate();
  const { data: report } = useWeeklyReport();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      await exportShareCardPng(cardRef.current);
    } finally {
      setExporting(false);
    }
  };

  if (!report) return null;

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex flex-col gap-8">
      <button
        type="button"
        onClick={() => navigate('/status')}
        className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted self-start hover:text-text"
      >
        &larr; Back to Status
      </button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold a-heading">Weekly report — {report.weekLabel}</h1>
        <Button variant="primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'EXPORTING…' : 'EXPORT SHARE CARD'}
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Figure label="XP this week" value={String(report.xpThisWeek)} accent />
        <Figure label="Best day" value={report.bestDay ? `+${report.bestDay.xp}` : '—'} />
        <Figure label="On-time rate" value={`${report.onTimeRatePct}%`} />
        <Figure label="Quests done" value={String(report.questsDone)} />
        <Figure label="Streak" value={`${report.streakDays}d`} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">Stat gains this week</h2>
        <div className="flex flex-col gap-2">
          {report.statGains.map((g) => {
            const max = report.statGains[0]?.gain ?? 1;
            return (
              <div key={g.code} className="flex items-center gap-3">
                <span className="font-display text-[13px] w-32 truncate">{g.name}</span>
                <div className="flex-1 h-2 rounded-pill bg-surface overflow-hidden">
                  <div className="h-full bg-text rounded-pill" style={{ width: `${(g.gain / max) * 100}%` }} />
                </div>
                <span className="font-mono text-[11px] text-accent tabular-nums w-14 text-right">+{g.gain}</span>
              </div>
            );
          })}
          {report.statGains.length === 0 && <p className="text-text-muted">Nothing logged this week.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-rule bg-surface p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">The System&apos;s review</h2>
        <p className="font-display text-[14px]">{report.summary}</p>
        {report.llmParagraph && <p className="text-text-muted">{report.llmParagraph}</p>}
      </section>

      {/* Off-screen full-size share card, captured by exportShareCardPng. */}
      <div className="fixed -left-[9999px] top-0" aria-hidden>
        <div
          ref={cardRef}
          className="w-[1080px] h-[1350px] bg-bg text-text flex flex-col items-center gap-10 p-20"
        >
          <span className="font-mono text-[18px] uppercase tracking-[.2em] text-text-muted">ASCENDANT</span>
          <span className="font-mono text-[16px] uppercase tracking-[.15em] text-text-muted">{report.weekLabel}</span>
          <span className="font-display font-extrabold a-numeral text-[300px] leading-none">{report.level}</span>
          <div className="flex items-center gap-4">
            <RankBadge rank={report.rank as 'E' | 'D' | 'C' | 'B' | 'A' | 'S'} size={56} />
            {report.titleName && <span className="font-display text-[22px]">{report.titleName}</span>}
          </div>
          <div className="flex items-center gap-12">
            <Figure label="XP this week" value={String(report.xpThisWeek)} accent large />
            <Figure label="On-time rate" value={`${report.onTimeRatePct}%`} large />
            <Figure label="Streak" value={`${report.streakDays}d`} large />
          </div>
          <div className="flex flex-col gap-3 w-full max-w-[760px]">
            {report.statGains.slice(0, 5).map((g) => {
              const max = report.statGains[0]?.gain ?? 1;
              return (
                <div key={g.code} className="flex items-center gap-4">
                  <span className="font-display text-[20px] w-40 truncate">{g.name}</span>
                  <div className="flex-1 h-3 rounded-pill bg-surface overflow-hidden">
                    <div className="h-full bg-text rounded-pill" style={{ width: `${(g.gain / max) * 100}%` }} />
                  </div>
                  <span className="font-mono text-[16px] text-accent tabular-nums w-20 text-right">+{g.gain}</span>
                </div>
              );
            })}
          </div>
          <p className="font-display text-[20px] text-center max-w-[760px]">{report.summary}</p>
          <span className="font-mono text-[13px] uppercase tracking-[.2em] text-text-muted mt-auto">
            LOCAL-FIRST / OPEN SOURCE
          </span>
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value, accent = false, large = false }: { label: string; value: string; accent?: boolean; large?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`font-display font-bold a-numeral ${large ? 'text-[48px]' : 'text-[20px]'} ${accent ? 'text-accent' : ''}`}
      >
        {value}
      </span>
      <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted text-center">{label}</span>
    </div>
  );
}
