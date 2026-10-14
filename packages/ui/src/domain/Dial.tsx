import clsx from '../lib/clsx';

export interface DialProps {
  size?: number;
  elapsedMin: number;
  totalMin: number;
  onBreak?: boolean;
  label?: string;
  className?: string;
}

/**
 * 60 ticks around a circle (majors every 5), --surface track, elapsed arc
 * accent (ok on break) with round caps, elapsed-minute ticks turn --text;
 * centre numerals + "OF Nm". Below 160px: numerals only (spec 9.2). role="timer".
 */
export function Dial({ size = 180, elapsedMin, totalMin, onBreak = false, label, className }: DialProps) {
  const remaining = Math.max(0, totalMin - elapsedMin);
  const mm = String(Math.floor(remaining)).padStart(2, '0');
  const ss = String(Math.round((remaining % 1) * 60)).padStart(2, '0');
  const center = size / 2;
  const radius = size * 0.42;
  const arcColor = onBreak ? 'var(--ok)' : 'var(--accent)';
  const pct = totalMin > 0 ? Math.max(0, Math.min(1, elapsedMin / totalMin)) : 0;
  const circumference = 2 * Math.PI * radius;

  if (size < 160) {
    return (
      <div role="timer" aria-label={`${label ?? 'Timer'}: ${mm}:${ss} remaining of ${totalMin} minutes`} className={clsx('flex flex-col items-center', className)}>
        <span className="font-display font-bold a-numeral tabular-nums" style={{ fontSize: size * 0.3, color: arcColor }}>
          {mm}:{ss}
        </span>
      </div>
    );
  }

  return (
    <div
      role="timer"
      aria-label={`${label ?? 'Timer'}: ${mm}:${ss} remaining of ${totalMin} minutes`}
      className={clsx('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {Array.from({ length: 60 }, (_, i) => {
          const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const isMajor = i % 5 === 0;
          const elapsedTicks = Math.round(pct * 60);
          const isElapsed = i < elapsedTicks;
          const tickOuter = radius + (isMajor ? 6 : 3);
          const tickInner = radius + (isMajor ? 10 : 7);
          const x1 = center + Math.cos(angle) * tickOuter;
          const y1 = center + Math.sin(angle) * tickOuter;
          const x2 = center + Math.cos(angle) * tickInner;
          const y2 = center + Math.sin(angle) * tickInner;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isElapsed ? 'var(--text)' : 'var(--rule)'}
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--surface)" strokeWidth={6} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold a-numeral tabular-nums" style={{ fontSize: size * 0.2, color: arcColor }}>
          {mm}:{ss}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">OF {totalMin}:00</span>
      </div>
    </div>
  );
}
