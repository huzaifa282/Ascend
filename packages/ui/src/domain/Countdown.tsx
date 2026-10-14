import clsx from '../lib/clsx';

export interface CountdownProps {
  /** Positive = time remaining; negative = overdue (late). */
  remainingMs: number;
  size?: 72 | 40 | 24 | 16;
  className?: string;
}

/** DD:HH:MM(:SS); warn (last hour) = accent; late = danger + "LATE +" tag (spec 9.2). role="timer". */
export function Countdown({ remainingMs, size = 40, className }: CountdownProps) {
  const late = remainingMs < 0;
  const abs = Math.abs(remainingMs);
  const totalSeconds = Math.floor(abs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const showSeconds = size >= 24 && days === 0 && hours === 0;
  const warn = !late && remainingMs <= 60 * 60 * 1000;

  const parts: Array<{ value: number; label: string }> = [];
  if (days > 0) parts.push({ value: days, label: 'D' });
  if (days > 0 || hours > 0) parts.push({ value: hours, label: 'H' });
  parts.push({ value: minutes, label: 'M' });
  if (showSeconds) parts.push({ value: seconds, label: 'S' });

  const colorClass = late ? 'text-danger' : warn ? 'text-accent' : 'text-text';

  return (
    <div
      role="timer"
      aria-label={`${late ? 'Overdue by' : 'Time remaining'}: ${days}d ${hours}h ${minutes}m`}
      className={clsx('flex items-end gap-2', className)}
    >
      {late && (
        <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-danger border border-danger rounded-pill px-1.5 mb-1">
          LATE +
        </span>
      )}
      {parts.map((p, i) => (
        <div key={i} className="flex items-baseline gap-0.5">
          <span
            className={clsx('font-display font-bold a-numeral tabular-nums', colorClass)}
            style={{ fontSize: size }}
          >
            {String(p.value).padStart(2, '0')}
          </span>
          <span className="font-mono text-[10px] text-text-muted uppercase">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
