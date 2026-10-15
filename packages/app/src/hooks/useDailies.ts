import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServiceContext, completeDaily as completeDailyService } from '../services';
import { localDateString } from '../lib/localTime';
import { resolveRepos } from './useRepos';
import { useMomentsStore } from '../stores/useMomentsStore';

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

export function useCompleteDaily() {
  const queryClient = useQueryClient();
  const pushMoment = useMomentsStore((s) => s.push);
  return useMutation({
    mutationFn: async (dailyId: string) => {
      const ctx = await createServiceContext();
      return completeDailyService(ctx, dailyId, Date.now());
    },
    onSuccess: (result) => {
      if (result.levelsGained > 0) {
        pushMoment({
          kind: 'levelUp',
          fromLevel: result.newLevel - result.levelsGained,
          toLevel: result.newLevel,
          hpRestored: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['dailyCompletions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
