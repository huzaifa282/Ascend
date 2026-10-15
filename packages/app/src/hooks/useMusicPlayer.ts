/**
 * Spec 11.1's built-in player: an `<audio>` element fed by `convertFileSrc`,
 * with a simple sequential (or shuffled/repeating) queue. Position updates
 * ride the element's own `timeupdate` event rather than a custom rAF loop,
 * and are skipped while the tab/window isn't visible (plan decision #6 —
 * no work done for an idle, hidden player).
 *
 * The widget and strip are separate webviews (separate JS heaps), and only
 * one `<audio>` element should ever actually be playing — the widget's,
 * since it stays alive (just hidden) when collapsed to the strip. This hook
 * is that single real player: it broadcasts `music:state` (track + playing,
 * spec 11.5's "track, play/pause") so the strip's read-only
 * `useMusicPlayerRemote` can mirror it, and it listens for `music:command`
 * so the strip's buttons can drive this same player.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import type { MusicTrackRow } from '@ascendant/db';
import { MUSIC_COMMAND_EVENT, MUSIC_STATE_EVENT } from './musicBus';
import type { MusicCommandPayload, MusicStatePayload } from './musicBus';

export interface MusicPlayerState {
  queue: MusicTrackRow[];
  currentIndex: number;
  playing: boolean;
  positionS: number;
  durationS: number;
  shuffled: boolean;
  repeating: boolean;
  volume: number;
}

const IDLE_STATE: MusicPlayerState = {
  queue: [],
  currentIndex: -1,
  playing: false,
  positionS: 0,
  durationS: 0,
  shuffled: false,
  repeating: false,
  volume: 100,
};

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useMusicPlayer() {
  const [state, setState] = useState<MusicPlayerState>(IDLE_STATE);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<MusicTrackRow[]>([]);
  const indexRef = useRef(-1);
  const shuffledRef = useRef(false);
  const repeatingRef = useRef(false);

  const setQueue = useCallback((tracks: MusicTrackRow[]) => {
    queueRef.current = tracks;
    setState((s) => ({ ...s, queue: tracks }));
  }, []);

  const loadTrack = useCallback((index: number, autoplay: boolean) => {
    const track = queueRef.current[index];
    const audio = audioRef.current;
    if (!track || !audio) return;
    audio.src = isTauri() ? convertFileSrc(track.path) : '';
    indexRef.current = index;
    setState((s) => ({ ...s, currentIndex: index, positionS: 0, durationS: track.durationS }));
    if (autoplay) void audio.play();
  }, []);

  const playTrackAt = useCallback(
    (index: number) => {
      loadTrack(index, true);
    },
    [loadTrack],
  );

  const next = useCallback(() => {
    const queue = queueRef.current;
    if (queue.length === 0) return;
    const nextIndex = shuffledRef.current
      ? queue.length > 1
        ? (indexRef.current + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length
        : 0
      : (indexRef.current + 1) % queue.length;
    loadTrack(nextIndex, true);
  }, [loadTrack]);

  const prev = useCallback(() => {
    const queue = queueRef.current;
    if (queue.length === 0) return;
    const prevIndex = (indexRef.current - 1 + queue.length) % queue.length;
    loadTrack(prevIndex, true);
  }, [loadTrack]);

  const playPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (indexRef.current < 0 && queueRef.current.length > 0) {
      loadTrack(0, true);
      return;
    }
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [loadTrack]);

  const seek = useCallback((positionS: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = positionS;
    setState((s) => ({ ...s, positionS }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = Math.min(1, Math.max(0, volume / 100));
    setState((s) => ({ ...s, volume }));
  }, []);

  const toggleShuffle = useCallback(() => {
    shuffledRef.current = !shuffledRef.current;
    setState((s) => ({ ...s, shuffled: shuffledRef.current }));
  }, []);

  const toggleRepeat = useCallback(() => {
    repeatingRef.current = !repeatingRef.current;
    setState((s) => ({ ...s, repeating: repeatingRef.current }));
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const track = state.currentIndex >= 0 ? state.queue[state.currentIndex] : undefined;
    const payload: MusicStatePayload = {
      title: track?.title ?? null,
      artist: track?.artist ?? null,
      artPath: track?.artPath ?? null,
      playing: state.playing,
    };
    void emit(MUSIC_STATE_EVENT, payload);
  }, [state.currentIndex, state.playing, state.queue]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<MusicCommandPayload>(MUSIC_COMMAND_EVENT, (event) => {
      if (event.payload.action === 'playPause') playPause();
      else if (event.payload.action === 'next') next();
      else if (event.payload.action === 'prev') prev();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [playPause, next, prev]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (document.visibilityState !== 'visible') return;
      setState((s) => ({ ...s, positionS: audio.currentTime, durationS: audio.duration || s.durationS }));
    };
    const onEnded = () => {
      if (repeatingRef.current) {
        audio.currentTime = 0;
        void audio.play();
      } else {
        next();
      }
    };
    const onPlay = () => setState((s) => ({ ...s, playing: true }));
    const onPause = () => setState((s) => ({ ...s, playing: false }));

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audioRef.current = null;
    };
  }, [next]);

  return { state, setQueue, playTrackAt, playPause, next, prev, seek, setVolume, toggleShuffle, toggleRepeat };
}
