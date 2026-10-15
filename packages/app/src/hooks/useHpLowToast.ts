import { useEffect, useRef } from 'react';
import { DEFAULT_RULESET } from '@ascendant/engine';
import { useProfile } from './useProfile';
import { useToastStore } from '../stores/useToastStore';

/** Spec 11.4 — an HP-low toast fires once per crossing below the danger threshold, not on every render. */
export function useHpLowToast(): void {
  const { data: profile } = useProfile();
  const pushToast = useToastStore((s) => s.push);
  const wasLow = useRef(false);

  useEffect(() => {
    if (!profile) return;
    const isLow = profile.hp > 0 && profile.hp <= DEFAULT_RULESET.hp.dangerThreshold;
    if (isLow && !wasLow.current) {
      pushToast({ tag: 'HP LOW', title: `HP is low, at ${profile.hp}`, danger: true, route: '/status' });
    }
    wasLow.current = isLow;
  }, [profile?.hp, pushToast]);
}
