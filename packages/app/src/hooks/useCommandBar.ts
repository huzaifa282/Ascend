import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { EntryItemRow } from '@ascendant/db';
import type { AcceptEntryItemResult } from '../services';
import {
  acceptEntryItem as acceptEntryItemService,
  createServiceContext,
  discardEntry as discardEntryService,
  removeEntryItem as removeEntryItemService,
  submitEntry as submitEntryService,
} from '../services';
import { useMomentsStore } from '../stores/useMomentsStore';

export interface CommandBarState {
  value: string;
  status: 'idle' | 'interpreting' | 'needs_confirm' | 'queued' | 'error';
  entryId: string | null;
  items: EntryItemRow[];
  error?: string;
}

const INITIAL_STATE: CommandBarState = { value: '', status: 'idle', entryId: null, items: [] };

/** Drives the whole spec 6.1 flow for the command bar / confirm card UI. */
export function useCommandBar() {
  const [state, setState] = useState<CommandBarState>(INITIAL_STATE);
  const queryClient = useQueryClient();
  const pushMoment = useMomentsStore((s) => s.push);

  const setValue = useCallback((value: string) => setState((s) => ({ ...s, value })), []);

  const pushLevelUpIfAny = useCallback(
    (result: AcceptEntryItemResult) => {
      if (result.levelsGained > 0) {
        pushMoment({
          kind: 'levelUp',
          fromLevel: result.newLevel - result.levelsGained,
          toLevel: result.newLevel,
          hpRestored: true,
        });
      }
      if (result.recoveryCleared) pushMoment({ kind: 'penaltyZoneCleared' });
    },
    [pushMoment],
  );

  const invalidateAfterAccept = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dailyCompletions'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
    queryClient.invalidateQueries({ queryKey: ['penaltyZone'] });
  }, [queryClient]);

  const submit = useCallback(async () => {
    const text = state.value.trim();
    if (!text) return;
    setState((s) => ({ ...s, status: 'interpreting' }));
    const ctx = await createServiceContext();
    const now = Date.now();
    const result = await submitEntryService(ctx, text, 'typed', now);

    if (result.status === 'needs_confirm') {
      const items = await ctx.repos.entryItems.listByEntry(result.entryId);
      setState({ value: '', status: 'needs_confirm', entryId: result.entryId, items });
    } else if (result.status === 'queued') {
      setState({ ...INITIAL_STATE });
    } else {
      setState({ value: text, status: 'error', entryId: result.entryId, items: [], error: result.error });
    }
  }, [state.value]);

  const acceptItem = useCallback(
    async (itemId: string) => {
      const ctx = await createServiceContext();
      const result = await acceptEntryItemService(ctx, itemId, Date.now());
      pushLevelUpIfAny(result);
      invalidateAfterAccept();
      setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) }));
    },
    [invalidateAfterAccept, pushLevelUpIfAny],
  );

  const acceptAll = useCallback(async () => {
    const ctx = await createServiceContext();
    const now = Date.now();
    for (const item of state.items) {
      const result = await acceptEntryItemService(ctx, item.id, now);
      pushLevelUpIfAny(result);
    }
    invalidateAfterAccept();
    setState({ ...INITIAL_STATE });
  }, [state.items, invalidateAfterAccept, pushLevelUpIfAny]);

  const removeItem = useCallback(async (itemId: string) => {
    const ctx = await createServiceContext();
    await removeEntryItemService(ctx, itemId, Date.now());
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) }));
  }, []);

  const discard = useCallback(async () => {
    if (!state.entryId) {
      setState({ ...INITIAL_STATE });
      return;
    }
    const ctx = await createServiceContext();
    await discardEntryService(ctx, state.entryId, Date.now());
    setState({ ...INITIAL_STATE });
  }, [state.entryId]);

  return { state, setValue, submit, acceptItem, acceptAll, removeItem, discard };
}
