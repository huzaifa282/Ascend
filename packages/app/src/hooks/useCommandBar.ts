import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { newId, type EntryItemRow } from '@ascendant/db';
import type { AcceptEntryItemResult } from '../services';
import {
  acceptEntryItem as acceptEntryItemService,
  createServiceContext,
  discardEntry as discardEntryService,
  removeEntryItem as removeEntryItemService,
  submitEntry as submitEntryService,
} from '../services';
import { useMomentsStore } from '../stores/useMomentsStore';

// `add task: ...` / `task: ...` / `todo: ...` create a task directly, with no
// LLM involved — so typing a plain task always works even with no model
// connected (spec 6.1's offline queue is for everything else that genuinely
// needs interpretation).
const LOCAL_TASK_PATTERN = /^(?:add\s+task|task|todo)\s*:\s*(.+)$/i;

export interface CommandBarState {
  value: string;
  status: 'idle' | 'interpreting' | 'needs_confirm' | 'queued' | 'error';
  entryId: string | null;
  items: EntryItemRow[];
  error?: string;
  /** True only for the "no model connected" queued case — shows a link to Settings > Model. */
  needsModelSetup?: boolean;
}

const INITIAL_STATE: CommandBarState = { value: '', status: 'idle', entryId: null, items: [] };

/** Drives the whole spec 6.1 flow for the command bar / confirm card UI. */
export function useCommandBar() {
  const [state, setState] = useState<CommandBarState>(INITIAL_STATE);
  const queryClient = useQueryClient();
  const pushMoment = useMomentsStore((s) => s.push);

  const setValue = useCallback(
    (value: string) =>
      setState((s) => (s.status === 'queued' ? { ...INITIAL_STATE, value } : { ...s, value })),
    [],
  );

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

    const localTaskMatch = LOCAL_TASK_PATTERN.exec(text);
    const title = localTaskMatch?.[1]?.trim();
    if (title) {
      const ctx = await createServiceContext();
      const now = Date.now();
      await ctx.repos.tasks.create({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        title,
        notes: null,
        dueAt: null,
        windowStart: now,
        difficulty: 3,
        estMinutes: null,
        statWeights: { DIS: 1 },
        reminderMinutes: null,
        status: 'open',
        completedAt: null,
        rewardTier: null,
        xpAwarded: null,
        rescheduleCount: 0,
        mainQuestId: null,
        emergency: false,
        expiresAt: null,
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setState({ ...INITIAL_STATE, status: 'queued', error: `Added task: "${title}".` });
      return;
    }

    setState((s) => ({ ...s, status: 'interpreting' }));
    const ctx = await createServiceContext();
    const now = Date.now();
    const result = await submitEntryService(ctx, text, 'typed', now);

    if (result.status === 'needs_confirm') {
      const items = await ctx.repos.entryItems.listByEntry(result.entryId);
      setState({ value: '', status: 'needs_confirm', entryId: result.entryId, items });
    } else if (result.status === 'queued') {
      // No model is connected — the entry is saved (status 'queued' in the DB) rather
      // than lost; say so instead of silently clearing the bar back to blank/idle.
      setState({
        ...INITIAL_STATE,
        status: 'queued',
        error: 'Saved — connect a model in Settings > Model to interpret it.',
        needsModelSetup: true,
      });
    } else {
      setState({ value: text, status: 'error', entryId: result.entryId, items: [], error: result.error });
    }
  }, [state.value, queryClient]);

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
