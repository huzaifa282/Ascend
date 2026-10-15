import clsx from '../lib/clsx';

export interface HpSegmentsProps {
  hp: number;
  max?: number;
  small?: boolean;
  className?: string;
}

/** 10 segments, 4px gap, radius xs, 20px tall (12 small); <=30 HP fills danger (spec 9.2). */
export function HpSegments({ hp, max = 100, small = false, className }: HpSegmentsProps) {
  const danger = hp <= 30;
  const segmentCount = 10;
  const filledSegments = Math.round((Math.max(0, Math.min(max, hp)) / max) * segmentCount);
  const height = small ? 12 : 20;

  const title = 'HP: drops when deadlines are missed or dailies go undone; restores on level-up or by clearing the Penalty Zone.';

  return (
    <div className={clsx('flex items-center gap-2', className)} title={title}>
      <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted">HP</span>
      <div
        role="img"
        aria-label={`HP ${hp} of ${max}${danger ? ', low' : ''}`}
        className="flex gap-1"
      >
        {Array.from({ length: segmentCount }, (_, i) => (
          <div
            key={i}
            className={clsx('w-3 rounded-xs', i < filledSegments ? (danger ? 'bg-danger' : 'bg-text') : 'bg-surface')}
            style={{ height }}
          />
        ))}
      </div>
      <span className={clsx('font-mono text-[13px] tabular-nums', danger && 'text-danger')}>
        {hp}/{max}
      </span>
    </div>
  );
}
