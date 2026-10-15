/** The widget<->strip music event contract (see useMusicPlayer's module doc). */

export const MUSIC_STATE_EVENT = 'music:state';
export const MUSIC_COMMAND_EVENT = 'music:command';

export interface MusicStatePayload {
  title: string | null;
  artist: string | null;
  artPath: string | null;
  playing: boolean;
}

export interface MusicCommandPayload {
  action: 'playPause' | 'next' | 'prev';
}
