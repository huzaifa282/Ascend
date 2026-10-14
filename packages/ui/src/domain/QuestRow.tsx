import type { ReactNode } from 'react';
import clsx from '../lib/clsx';
import { Checkbox } from '../primitives/Checkbox';

export interface QuestRowProps {
  title: string;
  meta?: string;
  done?: boolean;
  late?: boolean;
  statCode?: string;
  xp?: number;
  right?: ReactNode;
  onToggle?: (done: boolean) => void;
  onClick?: () => void;
}

/** 56px row; done = strikethrough muted; late = danger-wash bg + danger title (spec 9.2). */
export function QuestRow({ title, meta, done = false, late = false, statCode, xp, right, onToggle, onClick }: QuestRowProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 h-14 px-3 a-row cursor-default',
        late && !done && 'bg-danger-wash',
      )}
      onClick={onClick}
    >
      {onToggle && <Checkbox checked={done} onChange={onToggle} aria-label={`Mark "${title}" ${done ? 'not done' : 'done'}`} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <span
          className={clsx(
            'font-display text-[15px] truncate',
            done && 'line-through text-text-muted',
            late && !done && 'text-danger',
          )}
        >
          {title}
        </span>
        {meta && <span className="font-mono text-[11px] text-text-muted truncate">{meta}</span>}
      </div>
      {right}
      {statCode && (
        <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted flex-none">{statCode}</span>
      )}
      {xp != null && (
        <span className={clsx('font-mono text-[13px] tabular-nums flex-none', done ? 'text-text-muted' : 'text-accent')}>
          +{xp} XP
        </span>
      )}
    </div>
  );
}
