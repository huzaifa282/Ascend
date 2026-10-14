import clsx from '../lib/clsx';

export interface StatFaderProps {
  code: string;
  name: string;
  value: number;
  gain?: number;
  neglected?: boolean;
  idleDays?: number;
  dense?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Width 72 (36 dense). Fill grows from the bottom to value%; the top
 * `gain/value` portion is an accent cap (min 7px). Neglected: fill turns
 * --text-muted plus an "Idle Nd" danger pill (spec 9.2).
 */
export function StatFader({
  code,
  name,
  value,
  gain = 0,
  neglected = false,
  idleDays,
  dense = false,
  onClick,
  className,
}: StatFaderProps) {
  const trackHeight = dense ? 96 : 136;
  const fillPct = Math.max(0, Math.min(100, value));
  const fillHeight = (fillPct / 100) * trackHeight;
  const gainHeight = value > 0 ? Math.max(7, (Math.max(0, gain) / value) * fillHeight) : 0;

  const label = `${name}: ${value} of 100${gain > 0 ? `, plus ${gain} today` : ''}`;

  const content = (
    <div className={clsx('flex flex-col items-center', dense ? 'w-9' : 'w-[72px]', className)}>
      <div className="flex items-center gap-1 h-6">
        <span className="font-display font-bold text-[22px] leading-none a-numeral">{value}</span>
        {!dense && gain > 0 && <span className="font-mono text-[11px] text-accent">+{gain}</span>}
      </div>
      <div
        role="img"
        aria-label={label}
        className="relative rounded-pill bg-surface overflow-hidden"
        style={{ width: dense ? 8 : 10, height: trackHeight }}
      >
        <div
          className={clsx('absolute bottom-0 left-0 w-full rounded-pill', neglected ? 'bg-text-muted' : 'bg-text')}
          style={{ height: fillHeight }}
        >
          {!neglected && gainHeight > 0 && (
            <div className="absolute top-0 left-0 w-full bg-accent rounded-t-pill" style={{ height: gainHeight }} />
          )}
        </div>
      </div>
      <div className="flex flex-col items-center mt-1.5 gap-0.5">
        <span className="font-mono font-bold text-[11px] tracking-[.1em]">{code}</span>
        {!dense && <span className="font-display text-[11.5px] text-text-muted">{name}</span>}
        {neglected && (
          <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-danger border border-danger rounded-pill px-1.5">
            Idle{idleDays != null ? ` ${idleDays}d` : ''}
          </span>
        )}
      </div>
    </div>
  );

  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="rounded-md hover:bg-surface transition-colors duration-base p-1">
      {content}
    </button>
  );
}
