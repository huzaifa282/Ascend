import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shieldsRemaining } from '@ascendant/engine';
import { createServiceContext, useShield as useShieldService } from '../services';
import { localDateString, localMonthString } from '../lib/localTime';
import { useProfile } from './useProfile';

export function useShieldStatus() {
  const { data: profile } = useProfile();
  return useQuery({
    queryKey: ['shields', 'status', profile?.timezone],
    enabled: Boolean(profile),
    queryFn: async () => {
      const ctx = await createServiceContext();
      const today = localDateString(Date.now(), profile!.timezone);
      const month = localMonthString(today);
      const used = await ctx.repos.shields.listForMonth(month);
      return {
        remaining: shieldsRemaining(used.length, ctx.ruleset),
        usedCount: used.length,
        usedToday: used.some((s) => s.usedOn === today),
      };
    },
  });
}

export function useRestShield() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const ctx = await createServiceContext();
      return useShieldService(ctx, Date.now());
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['shields'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['dailies'] });
        queryClient.invalidateQueries({ queryKey: ['dailyCompletions'] });
      }
    },
  });
}
