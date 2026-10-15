import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newId } from '@ascendant/db';
import { DEFAULT_RULESET, dailyXpForSize, type DailySize } from '@ascendant/engine';
import { createServiceContext, completeDaily as completeDailyService, playFeedbackSound } from '../services';
import { localDateString } from '../lib/localTime';
import { resolveRepos } from './useRepos';
import { useMomentsStore } from '../stores/useMomentsStore';
import { useToastStore } from '../stores/useToastStore';

export function useActiveDailies() {
  return useQuery({
    queryKey: ['dailies', 'active'],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.dailies.listActive();
    },
  });
}

export function useTodaysDailyCompletions(timezone: string) {
  return useQuery({
    queryKey: ['dailyCompletions', 'today', timezone],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.dailyCompletions.listForDate(localDateString(Date.now(), timezone));
    },
    enabled: Boolean(timezone),
  });
}

/** Minimal "+ Add" path for Quests (spec 10.5) — title + size, daily recurrence. */
export function useCreateDaily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, size }: { title: string; size: DailySize }) => {
      const repos = await resolveRepos();
      const now = Date.now();
      await repos.dailies.create({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        title,
        statWeights: { DIS: 1 },
        xp: dailyXpForSize(size, DEFAULT_RULESET),
        recurrence: { type: 'daily' },
        active: true,
        sort: 0,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailies'] }),
  });
}

export function useCompleteDaily() {
  const queryClient = useQueryClient();
  const pushMoment = useMomentsStore((s) => s.push);
  const pushToast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: async (dailyId: string) => {
      const ctx = await createServiceContext();
      const daily = await ctx.repos.dailies.getById(dailyId);
      const result = await completeDailyService(ctx, dailyId, Date.now());
      return { ...result, title: daily?.title ?? 'Daily' };
    },
    onSuccess: (result) => {
      if (!result.alreadyDone) {
        pushToast({ tag: 'QUEST', title: `Quest complete: ${result.title}`, meta: `+${result.xp} XP` });
      }
      if (result.levelsGained > 0) {
        pushMoment({
          kind: 'levelUp',
          fromLevel: result.newLevel - result.levelsGained,
          toLevel: result.newLevel,
          hpRestored: true,
        });
        void playFeedbackSound('levelUp');
      } else if (!result.alreadyDone) {
        void playFeedbackSound('complete');
      }
      queryClient.invalidateQueries({ queryKey: ['dailyCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
