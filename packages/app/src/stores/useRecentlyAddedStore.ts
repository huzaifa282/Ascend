import { create } from 'zustand';

interface RecentlyAddedState {
  id: string | null;
  mark: (id: string) => void;
}

/**
 * Holds the single most-recently-created task/daily/quest id, so whichever
 * list renders that row next (within this window) knows to animate it in —
 * see `QuestRow`'s `isNew` prop. IDs are ULIDs and never reused, so there's
 * nothing to expire: the next `mark()` call just replaces the old one.
 */
export const useRecentlyAddedStore = create<RecentlyAddedState>((set) => ({
  id: null,
  mark: (id) => set({ id }),
}));
