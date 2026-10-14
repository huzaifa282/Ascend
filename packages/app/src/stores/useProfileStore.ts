import { create } from 'zustand';

interface ProfileState {
  name: string;
  levelingEnabled: boolean;
  level: number;
  rank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  xpIntoLevel: number;
  xpNeeded: number;
  hp: number;
  onboardingDone: boolean;
}

/**
 * Phase 0 placeholder. Phase 2 replaces this with a TanStack Query hook
 * (`useProfile`) reading the real `profile` row through `packages/db`.
 */
export const useProfileStore = create<ProfileState>(() => ({
  name: 'Alex',
  levelingEnabled: true,
  level: 1,
  rank: 'E',
  xpIntoLevel: 0,
  xpNeeded: 226,
  hp: 100,
  onboardingDone: true,
}));
