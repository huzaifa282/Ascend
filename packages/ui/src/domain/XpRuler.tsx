import clsx from '../lib/clsx';

export interface XpRulerProps {
  level: number;
  xpIntoLevel: number;
  xpNeeded: number;
  xpGainedToday?: number;
  compact?: boolean;
  className?: string;
}

/**
 * Big XP numeral, "/ N XP", "N TO LEVEL M" right-aligned; 16px pill bar
 * (fill --text, today's gain segment accent after it); 50-division ticks
 * below; footer LV N / +N XP TODAY / LV N+1 (spec 9.2). Compact: bar+ticks only.
 */
export function XpRuler({ level, xpIntoLevel, xpNeeded, xpGainedToday = 0, compact = false, className }: XpRulerProps) {
  const pct = xpNeeded > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpNeeded)) : 0;
  const todayStartXp = Math.max(0, xpIntoLevel - xpGainedToday);
  const todayStartPct = xpNeeded > 0 ? Math.max(0, Math.min(1, todayStartXp / xpNeeded)) : 0;
  const remaining = Math.max(0, xpNeeded - xpIntoLevel);
  const divisions = 50;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {!compact && (
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-[40px] leading-none a-numeral">
              {xpIntoLevel.toLocaleString()}
            </span>
            <span className="font-mono text-[13px] text-text-muted">/ {xpNeeded.toLocaleString()} XP</span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
            {remaining.toLocaleString()} TO LEVEL {level + 1}
          </span>
        </div>
      )}
      <div
        role="img"
        aria-label={`${xpIntoLevel} of ${xpNeeded} XP toward level ${level + 1}, ${xpGainedToday} today`}
        className="h-4 rounded-pill bg-surface overflow-hidden relative"
      >
        <div className="absolute inset-y-0 left-0 bg-text" style={{ width: `${todayStartPct * 100}%` }} />
        <div
          className="absolute inset-y-0 bg-accent"
          style={{ left: `${todayStartPct * 100}%`, width: `${(pct - todayStartPct) * 100}%` }}
        />
      </div>
      <div className="flex gap-px" aria-hidden>
        {Array.from({ length: divisions }, (_, i) => (
          <div
            key={i}
            className={clsx('flex-1 h-1.5', i % 5 === 0 ? 'bg-text-muted' : 'bg-rule')}
          />
        ))}
      </div>
      {!compact && (
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
          <span>LV {level}</span>
          <span className="text-accent">+{xpGainedToday.toLocaleString()} XP TODAY</span>
          <span>LV {level + 1}</span>
        </div>
      )}
    </div>
  );
}
