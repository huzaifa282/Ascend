import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkPenaltyZoneRecovery, createServiceContext, completeTask as completeTaskService } from '../services';
import { resolveRepos } from './useRepos';
import { useMomentsStore } from '../stores/useMomentsStore';

export function useOpenTasks() {
  return useQuery({
    queryKey: ['tasks', 'open'],
    queryFn: async () => {
      const repos = await resolveRepos();
      return repos.tasks.listOpen();
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const pushMoment = useMomentsStore((s) => s.push);
  return useMutation({
    mutationFn: async (taskId: string) => {
      const ctx = await createServiceContext();
      const result = await completeTaskService(ctx, taskId, Date.now());
      const recovery = await checkPenaltyZoneRecovery(ctx, Date.now());
      return { ...result, recoveryCleared: recovery.cleared };
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
      if (result.recoveryCleared) pushMoment({ kind: 'penaltyZoneCleared' });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
