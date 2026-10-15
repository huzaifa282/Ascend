import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkPenaltyZoneRecovery, createServiceContext, completeTask as completeTaskService } from '../services';
import { resolveRepos } from './useRepos';
import { useMomentsStore } from '../stores/useMomentsStore';
import { useToastStore } from '../stores/useToastStore';

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
  const pushToast = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: async (taskId: string) => {
      const ctx = await createServiceContext();
      const task = await ctx.repos.tasks.getById(taskId);
      const result = await completeTaskService(ctx, taskId, Date.now());
      const recovery = await checkPenaltyZoneRecovery(ctx, Date.now());
      return { ...result, recoveryCleared: recovery.cleared, title: task?.title ?? 'Quest' };
    },
    onSuccess: (result) => {
      if (result.tier !== 'failed') {
        pushToast({ tag: 'QUEST', title: `Quest complete: ${result.title}`, meta: `+${result.xp} XP` });
      }
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
