import { create } from 'zustand';

export type AccentTheme = 'azure' | 'ember' | 'acid' | 'mono';

interface UiState {
  accent: AccentTheme;
  reducedMotion: boolean;
  setAccent: (accent: AccentTheme) => void;
  setReducedMotion: (on: boolean) => void;
}

/**
 * Phase 0 placeholder for appearance settings. Phase 2 will back this with the
 * `settings` table (single row) instead of only living in memory.
 */
export const useUiStore = create<UiState>((set) => ({
  accent: 'azure',
  reducedMotion: false,
  setAccent: (accent) => {
    set({ accent });
    document.documentElement.setAttribute('data-theme', accent);
  },
  setReducedMotion: (on) => {
    set({ reducedMotion: on });
    document.documentElement.setAttribute('data-reduced-motion', on ? 'on' : 'off');
  },
}));
