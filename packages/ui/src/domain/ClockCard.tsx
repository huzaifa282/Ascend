import clsx from '../lib/clsx';
import { PlayButton } from '../primitives/PlayButton';

export type ClockCardState = 'idle' | 'running' | 'paused' | 'break';

export interface ClockCardProps {
  state: ClockCardState;
  elapsedMin: number;
  totalMin: number;
  linkedTitle?: string;
  onOpen: () => void;
  onPlayPause: () => void;
}

/**
 * Whole card opens TimerModal; label (FOCUS accent / BREAK ok / FOCUS TIMER
 * muted idle), 72px numerals, 4px progress pill; separate 52px PlayButton
 * bottom-right (spec 9.2).
 */
export function ClockCard({ state, elapsedMin, totalMin, linkedTitle, onOpen, onPlayPause }: ClockCardProps) {
  const remaining = Math.max(0, totalMin - elapsedMin);
  const mm = String(Math.floor(remaining)).padStart(2, '0');
  const ss = String(Math.round((remaining % 1) * 60)).padStart(2, '0');
  const pct = totalMin > 0 ? Math.max(0, Math.min(1, elapsedMin / totalMin)) : 0;
  const onBreak = state === 'break';
  const idle = state === 'idle';

  const label = idle ? 'FOCUS TIMER' : onBreak ? 'BREAK' : 'FOCUS';

  return (
    <div className="relative rounded-lg border border-rule bg-bg p-4 h-[180px]">
      <button type="button" onClick={onOpen} className="absolute inset-0 w-full h-full text-left p-4 flex flex-col gap-2">
        <span
          className={clsx(
            'font-mono text-[11px] uppercase tracking-[.1em]',
            idle ? 'text-text-muted' : onBreak ? 'text-ok' : 'text-accent',
          )}
        >
          {label}
        </span>
        <span className="font-display font-bold a-numeral tabular-nums text-[56px] leading-[1]">
          {idle ? '--:--' : `${mm}:${ss}`}
        </span>
        {!idle && (
          <div className="h-1 rounded-pill bg-surface overflow-hidden w-full max-w-[200px]">
            <div className={clsx('h-full rounded-pill', onBreak ? 'bg-ok' : 'bg-accent')} style={{ width: `${pct * 100}%` }} />
          </div>
        )}
        {linkedTitle && (
          <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted truncate">{linkedTitle}</span>
        )}
      </button>
      {!idle && (
        <div className="absolute bottom-4 right-4">
          <PlayButton
            playing={state === 'running'}
            onClick={(e) => {
              e.stopPropagation();
              onPlayPause();
            }}
            aria-label={state === 'running' ? 'Pause' : 'Resume'}
          />
        </div>
      )}
    </div>
  );
}
