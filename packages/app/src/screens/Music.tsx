import { useEffect, useMemo } from 'react';
import { Button, Card, NowPlaying, Toggle } from '@ascendant/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceContext } from '../services';
import { useMusicTracks, useMusicFolderSetting, useChooseAndScanMusicFolder, useRescanMusicFolder } from '../hooks/useMusicLibrary';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { assetUrl } from '../lib/assetUrl';
import type { MusicSettings } from '../settings/schema';

/** Music — spec 10.14. NowPlaying + Sources card, "from your music folder" album grid. */
export function Music() {
  const { data: tracks } = useMusicTracks();
  const { data: musicSettings } = useMusicFolderSetting();
  const chooseFolder = useChooseAndScanMusicFolder();
  const rescan = useRescanMusicFolder();
  const queryClient = useQueryClient();
  const { state, setQueue, playTrackAt, playPause, next, prev, seek, setVolume, toggleShuffle, toggleRepeat } =
    useMusicPlayer();

  useEffect(() => {
    if (tracks) setQueue(tracks);
  }, [tracks, setQueue]);

  const togglePlayWithTimer = useMutation({
    mutationFn: async (playMusicWithTimer: boolean) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (!row) return;
      const music = row.music as MusicSettings;
      await ctx.repos.settings.update(row.id, { music: { ...music, playMusicWithTimer }, updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['music', 'settings'] }),
  });

  const albums = useMemo(() => {
    const groups = new Map<string, { name: string; artUrl?: string; trackIndices: number[] }>();
    (tracks ?? []).forEach((t, i) => {
      const key = t.album ?? 'Unknown album';
      const existing = groups.get(key);
      if (existing) existing.trackIndices.push(i);
      else groups.set(key, { name: key, artUrl: assetUrl(t.artPath), trackIndices: [i] });
    });
    return Array.from(groups.values());
  }, [tracks]);

  const current = state.currentIndex >= 0 ? state.queue[state.currentIndex] : undefined;
  const folderPath = musicSettings?.musicFolderPath ?? null;

  return (
    <div className="max-w-[1000px] mx-auto px-10 py-6 flex flex-col gap-8">
      <h1 className="font-display text-[22px] font-bold a-heading">Music</h1>

      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
        {current ? (
          <NowPlaying
            artUrl={assetUrl(current.artPath)}
            title={current.title}
            artist={current.artist ?? undefined}
            album={current.album ?? undefined}
            positionS={state.positionS}
            durationS={state.durationS}
            playing={state.playing}
            shuffled={state.shuffled}
            repeating={state.repeating}
            volume={state.volume}
            source="MUSIC FOLDER"
            onPlayPause={playPause}
            onPrev={prev}
            onNext={next}
            onSeek={seek}
            onShuffle={toggleShuffle}
            onRepeat={toggleRepeat}
            onVolumeChange={setVolume}
          />
        ) : (
          <div className="flex items-center justify-center h-[320px] text-text-muted font-mono text-[12px] uppercase tracking-[.1em]">
            Nothing playing
          </div>
        )}

        <Card>
          <div className="flex flex-col gap-4 p-1">
            <div className="flex items-center justify-between gap-3 cursor-not-allowed opacity-60">
              <div>
                <span className="font-display text-[14px]">System media</span>
                <p className="font-mono text-[10.5px] text-text-muted">
                  Coming in a later version — the card will show whatever is playing in another app.
                </p>
              </div>
              <Toggle checked={false} onChange={() => {}} disabled aria-label="System media" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-[14px]">Music folder</span>
                <Toggle checked={Boolean(folderPath)} onChange={() => {}} disabled aria-label="Music folder" />
              </div>
              <span className="font-mono text-[10.5px] text-text-muted break-all">
                {folderPath ?? 'No folder chosen yet.'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="default" onClick={() => chooseFolder.mutate()} disabled={chooseFolder.isPending}>
                  {folderPath ? 'CHANGE FOLDER' : 'CHOOSE FOLDER'}
                </Button>
                {folderPath && (
                  <Button variant="default" onClick={() => rescan.mutate(folderPath)} disabled={rescan.isPending}>
                    RESCAN
                  </Button>
                )}
              </div>
              {chooseFolder.isError && (
                <span className="font-mono text-[10.5px] text-danger">{(chooseFolder.error as Error).message}</span>
              )}
              {rescan.isError && (
                <span className="font-mono text-[10.5px] text-danger">{(rescan.error as Error).message}</span>
              )}
            </div>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="font-display text-[14px]">Play music when the timer starts</span>
              <Toggle
                checked={musicSettings?.playMusicWithTimer ?? false}
                onChange={(v) => togglePlayWithTimer.mutate(v)}
                aria-label="Play music when the timer starts"
              />
            </label>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">From your music folder</h2>
        {albums.length === 0 ? (
          <p className="text-text-muted">
            {folderPath
              ? 'No tracks found yet. Try Rescan.'
              : 'Choose a music folder above to see your albums here.'}
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
            {albums.map((album) => (
              <button
                key={album.name}
                type="button"
                onClick={() => playTrackAt(album.trackIndices[0]!)}
                className="flex flex-col gap-2 text-left rounded-md"
              >
                <div className="w-full aspect-square rounded-md bg-surface overflow-hidden">
                  {album.artUrl && <img src={album.artUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <span className="font-display text-[13px] truncate">{album.name}</span>
                <span className="font-mono text-[10.5px] text-text-muted">
                  {album.trackIndices.length} track{album.trackIndices.length === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
