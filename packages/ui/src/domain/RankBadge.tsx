import clsx from '../lib/clsx';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface RankBadgeProps {
  rank: Rank;
  locked?: boolean;
  size?: number;
  className?: string;
}

/** Rounded square letter; current = --text fill, locked = --rule outline (spec 9.2). */
export function RankBadge({ rank, locked = false, size = 32, className }: RankBadgeProps) {
  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-display font-extrabold a-numeral',
        locked ? 'border border-rule text-text-muted' : 'bg-text text-bg',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      role="img"
      aria-label={`Rank ${rank}${locked ? ', locked' : ''}`}
    >
      {rank}
    </div>
  );
}
