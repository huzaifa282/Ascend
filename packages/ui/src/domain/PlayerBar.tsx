import { Icon } from '../icons/Icon';
import { IconButton } from '../primitives/IconButton';
import { PlayButton } from '../primitives/PlayButton';

export interface PlayerBarProps {
  artUrl?: string | null;
  title: string;
  artist?: string;
  playing: boolean;
  positionS: number;
  durationS: number;
  volume: number;
  timerLabel?: string; // e.g. "18:42"
  timerKind?: 'FOCUS' | 'BREAK';
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle?: () => void;
  onRepeat?: () => void;
  onVolumeChange: (v: number) => void;
  onSeek: (s: number) => void;
  onOpenTimer?: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * Bottom bar: art 44, title/artist (200px ellipsis), centred controls + thin
 * seek, timer chip, volume. Container queries (own box width, not viewport):
 * hide volume < 860px; hide seek/shuffle/repeat < 640px (spec 9.2).
 */
export function PlayerBar(props: PlayerBarProps) {
  const pct = props.durationS > 0 ? Math.min(1, props.positionS / props.durationS) : 0;

  return (
    <div className="@container w-full h-[64px] flex items-center gap-3 px-4">
      <div className="w-11 h-11 rounded-md bg-surface overflow-hidden flex-none">
        {props.artUrl && <img src={props.artUrl} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex flex-col min-w-0 w-[200px] flex-none">
        <span className="font-display text-[13px] truncate">{props.title}</span>
        {props.artist && <span className="font-mono text-[10.5px] text-text-muted truncate">{props.artist}</span>}
      </div>

      <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
        <IconButton icon="shuffle" aria-label="Shuffle" onClick={props.onShuffle} className="hidden @[640px]:inline-flex" />
        <IconButton icon="prev" aria-label="Previous" onClick={props.onPrev} />
        <PlayButton playing={props.playing} onClick={props.onPlayPause} aria-label={props.playing ? 'Pause' : 'Play'} size="small" />
        <IconButton icon="next" aria-label="Next" onClick={props.onNext} />
        <IconButton icon="repeat" aria-label="Repeat" onClick={props.onRepeat} className="hidden @[640px]:inline-flex" />
        <div
          className="hidden @[640px]:flex relative flex-1 max-w-[280px] h-1 rounded-pill bg-surface cursor-pointer"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={props.durationS}
          aria-valuenow={props.positionS}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            props.onSeek(Math.round(ratio * props.durationS));
          }}
        >
          <div className="absolute inset-y-0 left-0 bg-text rounded-pill" style={{ width: `${pct * 100}%` }} />
        </div>
        <span className="hidden @[640px]:inline font-mono text-[10.5px] text-text-muted tabular-nums flex-none">
          {formatTime(props.positionS)} / {formatTime(props.durationS)}
        </span>
      </div>

      {props.timerLabel && (
        <button
          type="button"
          onClick={props.onOpenTimer}
          className="flex items-center gap-1.5 h-touch px-2 rounded-md hover:bg-surface transition-colors duration-base flex-none"
        >
          <Icon name="timer" size={16} className="text-accent" />
          <span className="font-mono text-[12px] tabular-nums text-accent">{props.timerLabel}</span>
          <span className="font-mono text-[10px] uppercase tracking-[.1em] text-text-muted">{props.timerKind}</span>
        </button>
      )}

      <div className="hidden @[860px]:flex items-center gap-2 w-24 flex-none">
        <Icon name="vol" size={16} className="text-text-muted flex-none" />
        <input
          type="range"
          min={0}
          max={100}
          value={props.volume}
          onChange={(e) => props.onVolumeChange(Number(e.target.value))}
          aria-label="Volume"
          className="flex-1"
        />
      </div>
    </div>
  );
}
