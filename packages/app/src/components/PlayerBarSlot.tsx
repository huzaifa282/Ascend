/**
 * PlayerBar (spec 9.2) — hidden when nothing plays and no timer runs. The
 * real `<audio>` element lives in the widget window (see useMusicPlayer's
 * module doc); main mirrors it the same way the strip does.
 */
import { PlayerBar } from '@ascendant/ui';
import { useMusicPlayerRemote, useTimer } from '../hooks';
import { assetUrl } from '../lib/assetUrl';

export function PlayerBarSlot() {
  const { state: track, playPause, next, prev } = useMusicPlayerRemote();
  const { state: timer } = useTimer();

  const nothingPlaying = !track.title;
  const timerIdle = timer.phase === 'idle';
  if (nothingPlaying && timerIdle) return null;

  const leftS = Math.max(0, timer.totalS - timer.leftS >= 0 ? timer.leftS : 0);
  const mm = String(Math.floor(leftS / 60)).padStart(2, '0');
  const ss = String(Math.floor(leftS % 60)).padStart(2, '0');

  return (
    <PlayerBar
      artUrl={assetUrl(track.artPath)}
      title={track.title ?? 'Nothing playing'}
      artist={track.artist ?? undefined}
      playing={track.playing}
      positionS={0}
      durationS={0}
      volume={100}
      timerLabel={timerIdle ? undefined : `${mm}:${ss}`}
      timerKind={timer.kind === 'break' ? 'BREAK' : 'FOCUS'}
      onPlayPause={playPause}
      onPrev={prev}
      onNext={next}
      onVolumeChange={() => {}}
      onSeek={() => {}}
    />
  );
}
