/** Spec 5.4 — runs day close once per app session, on first mount of the main window. */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Rank } from '@ascendant/ui';
import { createServiceContext, dayClose } from '../services';
import { useMomentsStore } from '../stores/useMomentsStore';

export function useDayCloseOnMount(): void {
  const ran = useRef(false);
  const queryClient = useQueryClient();
  const push = useMomentsStore((s) => s.push);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const ctx = await createServiceContext();
      const summaries = await dayClose(ctx, Date.now());
      if (summaries.length === 0) return;

      for (const summary of summaries) {
        if (summary.trialPassed && summary.fromRank && summary.toRank) {
          push({ kind: 'rankUp', fromRank: summary.fromRank as Rank, toRank: summary.toRank as Rank });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['dailies'] });
      queryClient.invalidateQueries({ queryKey: ['systemMessages'] });
      queryClient.invalidateQueries({ queryKey: ['xpSeries'] });
    })();
  }, [push, queryClient]);
}
