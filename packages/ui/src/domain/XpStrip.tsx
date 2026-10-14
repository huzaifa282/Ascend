import clsx from '../lib/clsx';

export interface XpStripProps {
  /** Oldest to newest, 61 entries ideally (today last). */
  dailyXp: number[];
  className?: string;
}

/** 61 bars, rounded tops, muted 55% opacity, today accent, zero days = thin rule bars (spec 9.2). */
export function XpStrip({ dailyXp, className }: XpStripProps) {
  const max = Math.max(1, ...dailyXp);
  const avg = dailyXp.length ? Math.round(dailyXp.reduce((a, b) => a + b, 0) / dailyXp.length) : 0;
  const best = dailyXp.length ? Math.max(...dailyXp) : 0;
  const today = dailyXp[dailyXp.length - 1] ?? 0;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div
        role="img"
        aria-label={`XP per day over ${dailyXp.length} days, average ${avg}, best ${best}, today ${today}`}
        className="flex items-end gap-0.5 h-20"
      >
        {dailyXp.map((xp, i) => {
          const isToday = i === dailyXp.length - 1;
          const isZero = xp === 0;
          const height = isZero ? 2 : Math.max(3, (xp / max) * 80);
          return (
            <div
              key={i}
              className={clsx(
                'flex-1 rounded-t-xs',
                isZero ? 'bg-rule' : isToday ? 'bg-accent' : 'bg-text opacity-55',
              )}
              style={{ height }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted">
        <span>{dailyXp.length} DAYS AGO</span>
        <span>AVG {avg}</span>
        <span>BEST {best}</span>
        <span className="text-accent">TODAY {today}</span>
      </div>
    </div>
  );
}
