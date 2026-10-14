import { eq } from 'drizzle-orm';
import { musicTracks } from '../schema';
import type { Db } from './types';

export type MusicTrackRow = typeof musicTracks.$inferSelect;
export type NewMusicTrackRow = typeof musicTracks.$inferInsert;

export function createMusicTracksRepo(db: Db) {
  return {
    async upsertByPath(row: NewMusicTrackRow): Promise<void> {
      await db
        .insert(musicTracks)
        .values(row)
        .onConflictDoUpdate({
          target: musicTracks.path,
          set: {
            title: row.title,
            artist: row.artist,
            album: row.album,
            durationS: row.durationS,
            artPath: row.artPath,
            folder: row.folder,
            updatedAt: row.updatedAt,
          },
        });
    },
    async listByFolder(folder: string): Promise<MusicTrackRow[]> {
      return db.select().from(musicTracks).where(eq(musicTracks.folder, folder));
    },
    async list(): Promise<MusicTrackRow[]> {
      return db.select().from(musicTracks);
    },
  };
}
