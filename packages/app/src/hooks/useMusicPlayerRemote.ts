/**
 * The strip's read-only mirror of the widget's real player (see
 * useMusicPlayer's module doc) — no `<audio>` element here, just the last
 * `music:state` broadcast and commands sent back over `music:command`.
 */
import { useCallback, useEffect, useState } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { MUSIC_COMMAND_EVENT, MUSIC_STATE_EVENT } from './musicBus';
import type { MusicStatePayload } from './musicBus';

const IDLE_STATE: MusicStatePayload = { title: null, artist: null, artPath: null, playing: false };

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useMusicPlayerRemote() {
  const [state, setState] = useState<MusicStatePayload>(IDLE_STATE);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<MusicStatePayload>(MUSIC_STATE_EVENT, (event) => setState(event.payload)).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  const playPause = useCallback(() => void emit(MUSIC_COMMAND_EVENT, { action: 'playPause' }), []);
  const next = useCallback(() => void emit(MUSIC_COMMAND_EVENT, { action: 'next' }), []);
  const prev = useCallback(() => void emit(MUSIC_COMMAND_EVENT, { action: 'prev' }), []);

  return { state, playPause, next, prev };
}
