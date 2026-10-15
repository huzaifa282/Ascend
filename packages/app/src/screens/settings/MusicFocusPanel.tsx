import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Toggle } from '@ascendant/ui';
import { createServiceContext } from '../../services';
import { useChooseAndScanMusicFolder, useMusicFolderSetting, useRescanMusicFolder } from '../../hooks/useMusicLibrary';
import { resolveRepos } from '../../hooks/useRepos';
import type { MusicSettings, TimerSettings } from '../../settings/schema';

function useTimerSettings() {
  return useQuery({
    queryKey: ['timer', 'settings'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const row = await repos.settings.get();
      return (row?.timer as TimerSettings | undefined) ?? null;
    },
  });
}

/** Settings > Music and focus (spec 10.16). */
export function MusicFocusPanel() {
  const { data: musicSettings } = useMusicFolderSetting();
  const { data: timerSettings } = useTimerSettings();
  const chooseFolder = useChooseAndScanMusicFolder();
  const rescan = useRescanMusicFolder();
  const queryClient = useQueryClient();
  const folderPath = musicSettings?.musicFolderPath ?? null;

  const patchMusic = useMutation({
    mutationFn: async (patch: Partial<MusicSettings>) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (!row) return;
      const music = row.music as MusicSettings;
      await ctx.repos.settings.update(row.id, { music: { ...music, ...patch }, updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['music', 'settings'] }),
  });

  const patchTimer = useMutation({
    mutationFn: async (patch: Partial<TimerSettings>) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (!row) return;
      const timer = row.timer as TimerSettings;
      await ctx.repos.settings.update(row.id, { timer: { ...timer, ...patch }, updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timer', 'settings'] }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">Music and focus</h1>

      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Music</span>

        <label className="flex items-center justify-between gap-3 cursor-not-allowed opacity-60">
          <div>
            <span className="font-display text-[14px]">System media</span>
            <p className="font-mono text-[10.5px] text-text-muted">Coming in a later version.</p>
          </div>
          <Toggle checked={false} onChange={() => {}} disabled aria-label="System media" />
        </label>

        <div className="flex flex-col gap-1">
          <span className="font-display text-[14px]">Music folder</span>
          <span className="font-mono text-[10.5px] text-text-muted break-all">{folderPath ?? 'No folder chosen yet.'}</span>
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
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="font-display text-[14px]">Play music when the timer starts</span>
          <Toggle
            checked={musicSettings?.playMusicWithTimer ?? false}
            onChange={(v) => patchMusic.mutate({ playMusicWithTimer: v })}
            aria-label="Play music when the timer starts"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-not-allowed opacity-60">
          <div>
            <span className="font-display text-[14px]">Lower music while dictating</span>
            <p className="font-mono text-[10.5px] text-text-muted">Coming in a later version.</p>
          </div>
          <Toggle checked={false} onChange={() => {}} disabled aria-label="Lower music while dictating" />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Focus timer</span>

        <div className="flex flex-col gap-1">
          <label className="font-display text-[14px]" htmlFor="focus-minutes">
            Default focus length (minutes)
          </label>
          <input
            id="focus-minutes"
            type="number"
            min={5}
            max={180}
            value={timerSettings?.defaultFocusMinutes ?? 25}
            onChange={(e) => patchTimer.mutate({ defaultFocusMinutes: Number(e.target.value) })}
            className="h-touch w-24 rounded-md border border-rule bg-surface px-3 font-mono text-[13px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-display text-[14px]" htmlFor="break-minutes">
            Default break length (minutes)
          </label>
          <input
            id="break-minutes"
            type="number"
            min={5}
            max={15}
            value={timerSettings?.defaultBreakMinutes ?? 5}
            onChange={(e) => patchTimer.mutate({ defaultBreakMinutes: Number(e.target.value) })}
            className="h-touch w-24 rounded-md border border-rule bg-surface px-3 font-mono text-[13px]"
          />
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="font-display text-[14px]">Sound at end</span>
          <Toggle
            checked={timerSettings?.soundAtEnd ?? true}
            onChange={(v) => patchTimer.mutate({ soundAtEnd: v })}
            aria-label="Sound at end"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="font-display text-[14px]">Auto-start breaks</span>
          <Toggle
            checked={timerSettings?.autoStartBreaks ?? false}
            onChange={(v) => patchTimer.mutate({ autoStartBreaks: v })}
            aria-label="Auto-start breaks"
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="font-display text-[14px]">Leveling</span>
          <Toggle
            checked={timerSettings?.levelingEnabled ?? true}
            onChange={(v) => patchTimer.mutate({ levelingEnabled: v })}
            aria-label="Leveling"
          />
        </label>
      </div>
    </div>
  );
}
