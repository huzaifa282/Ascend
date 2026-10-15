import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createServiceContext } from '../services';
import { resolveRepos } from './useRepos';
import type { WidgetSettings } from '../settings/schema';

export function useWidgetSettings() {
  return useQuery({
    queryKey: ['widget', 'settings'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const row = await repos.settings.get();
      return (row?.widget as WidgetSettings | undefined) ?? null;
    },
  });
}

export function usePatchWidgetSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<WidgetSettings>) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (!row) return;
      const widget = row.widget as WidgetSettings;
      await ctx.repos.settings.update(row.id, { widget: { ...widget, ...patch }, updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widget', 'settings'] }),
  });
}
