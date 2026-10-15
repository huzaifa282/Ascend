import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newId } from '@ascendant/db';
import { createServiceContext } from '../services';
import { resolveRepos } from './useRepos';

export function useSkillsList() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => (await resolveRepos()).skills.list(),
  });
}

export function useOpenSkillSuggestions() {
  return useQuery({
    queryKey: ['skillSuggestions', 'open'],
    queryFn: async () => (await resolveRepos()).skillSuggestions.listOpen(),
  });
}

export function useApproveSkillSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const ctx = await createServiceContext();
      const now = Date.now();
      const suggestions = await ctx.repos.skillSuggestions.listOpen();
      const row = suggestions.find((s) => s.id === suggestionId);
      if (!row) return;
      await ctx.repos.skills.create({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        name: row.name,
        statCodes: row.statCodes,
        xp: 0,
        level: 1,
        minutes: 0,
        lastTrainedAt: null,
      });
      await ctx.repos.skillSuggestions.update(suggestionId, { status: 'approved', updatedAt: now });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['skillSuggestions'] });
    },
  });
}

export function useDismissSkillSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const ctx = await createServiceContext();
      await ctx.repos.skillSuggestions.update(suggestionId, { status: 'dismissed', updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skillSuggestions'] }),
  });
}
