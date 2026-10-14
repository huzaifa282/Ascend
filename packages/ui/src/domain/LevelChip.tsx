import { RankBadge } from './RankBadge';
import type { Rank } from './RankBadge';

export interface LevelChipProps {
  level: number;
  rank: Rank;
  xpIntoLevel: number;
  xpNeeded: number;
  onClick?: () => void;
}

/** 48px ring (accent arc on surface track), "Level N", Rank badge, 160x6 XP bar (spec 9.2). Opens Status. */
export function LevelChip({ level, rank, xpIntoLevel, xpNeeded, onClick }: LevelChipProps) {
  const pct = xpNeeded > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpNeeded)) : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 h-touch px-2 rounded-md hover:bg-surface transition-colors duration-base"
      aria-label={`Level ${level}, Rank ${rank}, ${xpIntoLevel} of ${xpNeeded} XP to next level`}
    >
      <svg width={48} height={48} viewBox="0 0 48 48" className="flex-none" aria-hidden>
        <circle cx={24} cy={24} r={radius} fill="none" stroke="var(--surface)" strokeWidth={4} />
        <circle
          cx={24}
          cy={24}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform="rotate(-90 24 24)"
        />
        <text x={24} y={24} textAnchor="middle" dominantBaseline="central" className="font-display font-bold a-numeral" fontSize={15} fill="var(--text)">
          {level}
        </text>
      </svg>
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <span className="font-display heading-m text-[15px] font-semibold">Level {level}</span>
          <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted">
            <RankBadge rank={rank} size={16} />
            Rank {rank}
          </span>
        </div>
        <div className="w-40 h-1.5 rounded-pill bg-surface overflow-hidden">
          <div className="h-full bg-text rounded-pill" style={{ width: `${pct * 100}%` }} />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-text-muted">
          {xpIntoLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP
        </span>
      </div>
    </button>
  );
}
