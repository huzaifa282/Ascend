/**
 * Spec 11.1 — the music folder half of the music card. Scanning runs
 * through the Rust `scan_music_folder` command (tags/cover art via
 * `lofty`); this service just persists the results through the
 * `musicTracks` repo, the same as every other table (docs/decisions.md).
 * System media (SMTC) is deferred — see docs/decisions.md.
 */
import { newId } from '@ascendant/db';
import { invoke } from '@tauri-apps/api/core';
import type { ServiceContext } from './context';

export interface ScannedTrack {
  path: string;
  title: string;
  artist: string | null;
  album: string | null;
  durationS: number;
  artPath: string | null;
  folder: string;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Opens the OS folder picker; resolves to null if unavailable (browser dev) or cancelled. */
export async function pickMusicFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const folder = await open({ directory: true, multiple: false });
  return typeof folder === 'string' ? folder : null;
}

/** Scans `folder` and upserts every readable track. Returns the track count. Throws the Rust error string on a missing/unplugged folder. */
export async function scanMusicFolder(ctx: ServiceContext, folder: string, now: number): Promise<number> {
  if (!isTauri()) return 0;
  const tracks = await invoke<ScannedTrack[]>('scan_music_folder', { folder });
  for (const track of tracks) {
    await ctx.repos.musicTracks.upsertByPath({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      path: track.path,
      title: track.title,
      artist: track.artist,
      album: track.album,
      durationS: track.durationS,
      artPath: track.artPath,
      folder: track.folder,
    });
  }
  return tracks.length;
}
