import { create } from 'zustand';
import type { Rank } from '@ascendant/ui';

export type Moment =
  | { kind: 'levelUp'; fromLevel: number; toLevel: number; hpRestored: boolean }
  | { kind: 'rankUp'; fromRank: Rank; toRank: Rank }
  | { kind: 'titleEarned'; name: string; howEarned: string; titleId: string }
  | { kind: 'penaltyZoneCleared' };

interface MomentsState {
  queue: Moment[];
  push: (moment: Moment) => void;
  dismissCurrent: () => void;
}

/** Spec 10.9 — level up / rank up / title earned overlays, shown one at a time, FIFO. */
export const useMomentsStore = create<MomentsState>((set) => ({
  queue: [],
  push: (moment) => set((s) => ({ queue: [...s.queue, moment] })),
  dismissCurrent: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
