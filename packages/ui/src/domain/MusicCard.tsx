import clsx from '../lib/clsx';
import { Icon } from '../icons/Icon';
import { IconButton } from '../primitives/IconButton';
import { PlayButton } from '../primitives/PlayButton';
import { Button } from '../primitives/Button';

export interface MusicCardProps {
  nothingPlaying?: boolean;
  artUrl?: string | null;
  title?: string;
  artist?: string;
  positionS?: number;
  durationS?: number;
  playing?: boolean;
  source?: string; // "VIA SPOTIFY APP" or "MUSIC FOLDER"
  onPlayPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSeek?: (positionS: number) => void;
  onOpenFolder?: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Art 64, title/artist, prev/play/next, 4px seek, times, source line; empty state (spec 9.2). */
export function MusicCard(props: MusicCardProps) {
  if (props.nothingPlaying) {
    return (
      <div className="rounded-lg border border-rule bg-bg p-4 h-[88px] flex items-center gap-3">
        <div className="w-12 h-12 rounded-md bg-surface flex items-center justify-center flex-none">
          <Icon name="music" size={20} className="text-text-muted" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="font-display text-[14px] text-text-muted truncate">Nothing playing</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted truncate">
            START ANY PLAYER
          </span>
        </div>
        {props.onOpenFolder && (
          <Button variant="default" onClick={props.onOpenFolder}>
            OPEN FOLDER
          </Button>
        )}
      </div>
    );
  }

  const pct = props.durationS ? Math.min(1, (props.positionS ?? 0) / props.durationS) : 0;

  return (
    <div className="rounded-lg border border-rule bg-bg p-4 flex items-center gap-3">
      <div className="w-16 h-16 rounded-md bg-surface flex-none overflow-hidden">
        {props.artUrl && <img src={props.artUrl} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="font-display heading-m text-[15px] truncate">{props.title}</span>
        <span className="font-mono text-[11px] text-text-muted truncate">{props.artist}</span>
        <div className="flex items-center gap-2">
          <IconButton icon="prev" aria-label="Previous" onClick={props.onPrev} />
          <PlayButton playing={!!props.playing} onClick={props.onPlayPause} aria-label={props.playing ? 'Pause' : 'Play'} size="small" />
          <IconButton icon="next" aria-label="Next" onClick={props.onNext} />
          <div className="flex-1 flex items-center gap-2">
            <div
              className="relative flex-1 h-1 rounded-pill bg-surface cursor-pointer"
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={props.durationS ?? 0}
              aria-valuenow={props.positionS ?? 0}
              onClick={(e) => {
                if (!props.onSeek || !props.durationS) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                props.onSeek(Math.round(ratio * props.durationS));
              }}
            >
              <div className="absolute inset-y-0 left-0 bg-text rounded-pill" style={{ width: `${pct * 100}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-pill bg-text"
                style={{ left: `calc(${pct * 100}% - 5px)` }}
              />
            </div>
            <span className="font-mono text-[10.5px] text-text-muted tabular-nums flex-none">
              {formatTime(props.positionS ?? 0)} / {formatTime(props.durationS ?? 0)}
            </span>
          </div>
        </div>
        {props.source && (
          <span className={clsx('font-mono text-[10px] uppercase tracking-[.1em] text-text-muted')}>{props.source}</span>
        )}
      </div>
    </div>
  );
}
