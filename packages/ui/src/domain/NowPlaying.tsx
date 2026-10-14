import { Icon } from '../icons/Icon';
import { IconButton } from '../primitives/IconButton';
import { PlayButton } from '../primitives/PlayButton';

export interface NowPlayingProps {
  artUrl?: string | null;
  title: string;
  artist?: string;
  album?: string;
  positionS: number;
  durationS: number;
  playing: boolean;
  shuffled?: boolean;
  repeating?: boolean;
  volume: number;
  source?: string;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (positionS: number) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onVolumeChange: (v: number) => void;
  onSave?: () => void;
  onQueue?: () => void;
  onOutput?: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Music page: 168px art, 20px title, save/queue/output, seek+times, shuffle/prev/play/next/repeat, volume (spec 9.2). */
export function NowPlaying(props: NowPlayingProps) {
  const pct = props.durationS > 0 ? Math.min(1, props.positionS / props.durationS) : 0;

  return (
    <div className="flex flex-col items-center gap-4 max-w-[420px] mx-auto">
      <div className="w-[168px] h-[168px] rounded-lg bg-surface overflow-hidden flex-none">
        {props.artUrl && <img src={props.artUrl} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-display text-[20px] font-semibold">{props.title}</span>
        {props.artist && <span className="font-mono text-[12px] text-text-muted">{props.artist}{props.album ? ` — ${props.album}` : ''}</span>}
      </div>
      <div className="flex items-center gap-4">
        {props.onSave && <IconButton icon="heart" aria-label="Save" onClick={props.onSave} />}
        {props.onQueue && <IconButton icon="queue" aria-label="Queue" onClick={props.onQueue} />}
        {props.onOutput && <IconButton icon="speaker" aria-label="Output" onClick={props.onOutput} />}
      </div>
      <div className="w-full flex items-center gap-2">
        <span className="font-mono text-[10.5px] text-text-muted tabular-nums w-10 text-right">{formatTime(props.positionS)}</span>
        <div
          className="relative flex-1 h-1 rounded-pill bg-surface cursor-pointer"
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
        <span className="font-mono text-[10.5px] text-text-muted tabular-nums w-10">{formatTime(props.durationS)}</span>
      </div>
      <div className="flex items-center gap-4">
        <IconButton icon="shuffle" aria-label="Shuffle" onClick={props.onShuffle} className={props.shuffled ? 'text-accent' : ''} />
        <IconButton icon="prev" aria-label="Previous" onClick={props.onPrev} />
        <PlayButton playing={props.playing} onClick={props.onPlayPause} aria-label={props.playing ? 'Pause' : 'Play'} size="large" />
        <IconButton icon="next" aria-label="Next" onClick={props.onNext} />
        <IconButton icon="repeat" aria-label="Repeat" onClick={props.onRepeat} className={props.repeating ? 'text-accent' : ''} />
      </div>
      <div className="w-full flex items-center gap-2">
        <Icon name="vol" size={18} className="text-text-muted flex-none" />
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
      {props.source && <span className="font-mono text-[10px] uppercase tracking-[.1em] text-text-muted">{props.source}</span>}
    </div>
  );
}
