import { useEffect } from 'react';
import { MusicCard } from '@ascendant/ui';
import { useMusicTracks, useChooseAndScanMusicFolder } from '../hooks/useMusicLibrary';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { assetUrl } from '../lib/assetUrl';

/** Wires MusicCard to the built-in music-folder player (spec 9.2, 11.1). */
export function MusicCardContainer() {
  const { data: tracks } = useMusicTracks();
  const chooseFolder = useChooseAndScanMusicFolder();
  const { state, setQueue, playTrackAt, playPause, next, prev, seek } = useMusicPlayer();

  useEffect(() => {
    if (tracks) setQueue(tracks);
  }, [tracks, setQueue]);

  const current = state.currentIndex >= 0 ? state.queue[state.currentIndex] : undefined;

  if (!current) {
    return (
      <MusicCard
        nothingPlaying
        onOpenFolder={() => {
          if (state.queue.length > 0) playTrackAt(0);
          else chooseFolder.mutate();
        }}
      />
    );
  }

  return (
    <MusicCard
      artUrl={assetUrl(current.artPath)}
      title={current.title}
      artist={current.artist ?? undefined}
      positionS={state.positionS}
      durationS={state.durationS}
      playing={state.playing}
      source="MUSIC FOLDER"
      onPlayPause={playPause}
      onPrev={prev}
      onNext={next}
      onSeek={seek}
    />
  );
}
