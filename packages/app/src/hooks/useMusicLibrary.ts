import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServiceContext, pickMusicFolder, scanMusicFolder } from '../services';
import { resolveRepos } from './useRepos';
import type { MusicSettings } from '../settings/schema';

export function useMusicTracks() {
  return useQuery({
    queryKey: ['music', 'tracks'],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.musicTracks.list();
    },
  });
}

export function useMusicFolderSetting() {
  return useQuery({
    queryKey: ['music', 'settings'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const row = await repos.settings.get();
      return (row?.music as MusicSettings | undefined) ?? null;
    },
  });
}

/** Opens the folder picker, saves the choice, then scans it. Resolves to the track count, or null if cancelled. */
export function useChooseAndScanMusicFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const folder = await pickMusicFolder();
      if (!folder) return null;
      const now = Date.now();
      const ctx = await createServiceContext();
      const settingsRow = await ctx.repos.settings.get();
      if (settingsRow) {
        const music = settingsRow.music as MusicSettings;
        await ctx.repos.settings.update(settingsRow.id, { music: { ...music, musicFolderPath: folder }, updatedAt: now });
      }
      return scanMusicFolder(ctx, folder, now);
    },
    onSuccess: (count) => {
      if (count === null) return;
      queryClient.invalidateQueries({ queryKey: ['music'] });
    },
  });
}

/** Re-scans the already-saved folder (spec: manual re-scan, see docs/decisions.md). */
export function useRescanMusicFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folder: string) => {
      const ctx = await createServiceContext();
      return scanMusicFolder(ctx, folder, Date.now());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['music'] });
    },
  });
}
