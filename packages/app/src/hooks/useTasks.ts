import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServiceContext, completeTask as completeTaskService } from '../services';
import { resolveRepos } from './useRepos';

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
  return useMutation({
    mutationFn: async (taskId: string) => {
      const ctx = await createServiceContext();
      return completeTaskService(ctx, taskId, Date.now());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
