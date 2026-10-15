import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  applyStatBaselines,
  bootstrapProfile,
  createServiceContext,
  createSuggestedDailies,
  setProfileNameToneAndFinish,
} from '../services';
import { baselineStatXp, suggestedDailies, type OnboardingAnswers, type SuggestedDaily } from '../onboarding/baselines';

export interface OnboardingState {
  name: string;
  tone: 'strict' | 'neutral' | 'encouraging';
  answers: OnboardingAnswers;
  selectedDailies: Set<string>;
}

const INITIAL_STATE: OnboardingState = {
  name: '',
  tone: 'neutral',
  answers: {},
  selectedDailies: new Set(),
};

export function useOnboarding() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);

  // Spec 10.1: a brand-new install has no profile/settings/stats rows yet
  // (only the seed generator created them before this screen existed).
  // Creating them as soon as onboarding opens means step 4's model panel
  // (the ordinary Settings > Model UI, reused as-is) has a real settings
  // row to persist into.
  useEffect(() => {
    void (async () => {
      const ctx = await createServiceContext();
      await bootstrapProfile(ctx, Date.now());
    })();
  }, []);

  const setName = useCallback((name: string) => setState((s) => ({ ...s, name })), []);
  const setTone = useCallback((tone: OnboardingState['tone']) => setState((s) => ({ ...s, tone })), []);
  const setAnswer = useCallback(
    (questionId: string, optionIndex: number) =>
      setState((s) => ({ ...s, answers: { ...s.answers, [questionId]: optionIndex } })),
    [],
  );

  const dailies = suggestedDailies(state.answers);

  const toggleDaily = useCallback((title: string) => {
    setState((s) => {
      const next = new Set(s.selectedDailies);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return { ...s, selectedDailies: next };
    });
  }, []);

  const ensureDailiesSelected = useCallback((titles: string[]) => {
    setState((s) => (s.selectedDailies.size > 0 ? s : { ...s, selectedDailies: new Set(titles) }));
  }, []);

  const commitBaselines = useCallback(async () => {
    const ctx = await createServiceContext();
    await applyStatBaselines(ctx, baselineStatXp(state.answers), Date.now());
  }, [state.answers]);

  const finish = useCallback(async () => {
    setSubmitting(true);
    try {
      const ctx = await createServiceContext();
      const chosenDailies: SuggestedDaily[] = dailies.filter((d) => state.selectedDailies.has(d.title));
      await createSuggestedDailies(ctx, chosenDailies, Date.now());
      await setProfileNameToneAndFinish(ctx, { name: state.name.trim() || 'Friend', tone: state.tone, now: Date.now() });
      await queryClient.invalidateQueries();
    } finally {
      setSubmitting(false);
    }
  }, [state, dailies, queryClient]);

  return {
    state,
    setName,
    setTone,
    setAnswer,
    dailies,
    toggleDaily,
    ensureDailiesSelected,
    commitBaselines,
    finish,
    submitting,
  };
}
