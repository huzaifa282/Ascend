import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { newId, type EntryItemRow } from '@ascendant/db';
import type { AcceptEntryItemResult, EntryItemXpPreview, ServiceContext } from '../services';
import {
  acceptEntryItem as acceptEntryItemService,
  answerDurationFollowUp as answerDurationFollowUpService,
  createServiceContext,
  discardEntry as discardEntryService,
  playFeedbackSound,
  previewEntryItemXp,
  removeEntryItem as removeEntryItemService,
  submitEntry as submitEntryService,
  updateLogItemDetails as updateLogItemDetailsService,
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
  /** XP/stat preview per item.id — null means "can't preview yet" (e.g. a log with no duration). */
  previews: Record<string, EntryItemXpPreview | null>;
  /** True while a typed duration answer is being read (locally, or by the model fallback). */
  durationPending: Record<string, boolean>;
  /** Set when a duration answer couldn't be read at all — cleared on the next attempt. */
  durationErrors: Record<string, string | undefined>;
  error?: string;
  /** True only for the "no model connected" queued case — shows a link to Settings > Model. */
  needsModelSetup?: boolean;
}

const INITIAL_STATE: CommandBarState = {
  value: '',
  status: 'idle',
  entryId: null,
  items: [],
  previews: {},
  durationPending: {},
  durationErrors: {},
};

async function buildPreviews(
  ctx: ServiceContext,
  items: EntryItemRow[],
  now: number,
): Promise<Record<string, EntryItemXpPreview | null>> {
  const entries = await Promise.all(items.map(async (item) => [item.id, await previewEntryItemXp(ctx, item, now)] as const));
  return Object.fromEntries(entries);
}

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
        void playFeedbackSound('levelUp');
      }
      if (result.recoveryCleared) {
        pushMoment({ kind: 'penaltyZoneCleared' });
        void playFeedbackSound('cleared');
      }
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
      void playFeedbackSound('confirm');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setState({ ...INITIAL_STATE, status: 'queued', error: `Added task: "${title}".` });
      return;
    }

    setState((s) => ({ ...s, status: 'interpreting' }));
    try {
      const ctx = await createServiceContext();
      const now = Date.now();
      const result = await submitEntryService(ctx, text, 'typed', now);

      if (result.status === 'needs_confirm') {
        const items = await ctx.repos.entryItems.listByEntry(result.entryId);
        const previews = await buildPreviews(ctx, items, now);
        setState({ value: '', status: 'needs_confirm', entryId: result.entryId, items, previews, durationPending: {}, durationErrors: {} });
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
        setState({
          value: text,
          status: 'error',
          entryId: result.entryId,
          items: [],
          previews: {},
          durationPending: {},
          durationErrors: {},
          error: result.error,
        });
      }
    } catch (err) {
      // Anything thrown here (not just a reported result.error) must still clear
      // 'interpreting' — otherwise the command bar is stuck showing that state
      // forever with no way to retry.
      setState({
        value: text,
        status: 'error',
        entryId: null,
        items: [],
        previews: {},
        durationPending: {},
        durationErrors: {},
        error: err instanceof Error ? err.message : 'Something went wrong.',
      });
    }
  }, [state.value, queryClient]);

  const acceptItem = useCallback(
    async (itemId: string) => {
      try {
        const ctx = await createServiceContext();
        const result = await acceptEntryItemService(ctx, itemId, Date.now());
        pushLevelUpIfAny(result);
        // Skip the plain "complete" chime when the bigger level-up/cleared one
        // already fired for this accept — two chimes stacked reads as a glitch.
        if (result.levelsGained === 0 && !result.recoveryCleared) void playFeedbackSound('complete');
        invalidateAfterAccept();
        setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId), error: undefined }));
      } catch (err) {
        // The UI already disables Accept while a log's duration is unresolved;
        // this is the backstop (the service re-checks) if that's ever bypassed.
        setState((s) => ({ ...s, error: err instanceof Error ? err.message : 'Could not accept that item.' }));
      }
    },
    [invalidateAfterAccept, pushLevelUpIfAny],
  );

  const acceptAll = useCallback(async () => {
    try {
      const ctx = await createServiceContext();
      const now = Date.now();
      let bigMomentFired = false;
      for (const item of state.items) {
        const result = await acceptEntryItemService(ctx, item.id, now);
        pushLevelUpIfAny(result);
        if (result.levelsGained > 0 || result.recoveryCleared) bigMomentFired = true;
      }
      // One chime for the whole batch — same reasoning as acceptItem, just
      // deferred until the loop ends so it isn't one chime per item.
      if (!bigMomentFired && state.items.length > 0) void playFeedbackSound('complete');
      invalidateAfterAccept();
      setState({ ...INITIAL_STATE });
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err.message : 'Could not accept those items.' }));
    }
  }, [state.items, invalidateAfterAccept, pushLevelUpIfAny]);

  /**
   * A duration follow-up answer — a suggested pill (a plain "30") or
   * free-typed text ("6-6:40", "an hour and a half") both go through the
   * same path: the local parser resolves a pill instantly with nothing
   * pending, and only a typed answer it can't read falls back to the model
   * (spec 6.5), surfacing "couldn't read that" rather than doing nothing.
   */
  const answerDuration = useCallback(async (itemId: string, text: string) => {
    setState((s) => ({
      ...s,
      durationPending: { ...s.durationPending, [itemId]: true },
      durationErrors: { ...s.durationErrors, [itemId]: undefined },
    }));
    try {
      const ctx = await createServiceContext();
      const now = Date.now();
      const result = await answerDurationFollowUpService(ctx, itemId, text, now);
      if (!result.ok) {
        setState((s) => ({
          ...s,
          durationPending: { ...s.durationPending, [itemId]: false },
          durationErrors: { ...s.durationErrors, [itemId]: result.message ?? "Couldn't read that." },
        }));
        return;
      }
      const updated = await ctx.repos.entryItems.getById(itemId);
      const preview = updated ? await previewEntryItemXp(ctx, updated, now) : null;
      setState((s) => ({
        ...s,
        items: updated ? s.items.map((i) => (i.id === itemId ? updated : i)) : s.items,
        previews: updated ? { ...s.previews, [itemId]: preview } : s.previews,
        durationPending: { ...s.durationPending, [itemId]: false },
        durationErrors: { ...s.durationErrors, [itemId]: undefined },
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        durationPending: { ...s.durationPending, [itemId]: false },
        durationErrors: { ...s.durationErrors, [itemId]: err instanceof Error ? err.message : "Couldn't read that." },
      }));
    }
  }, []);

  /** How-hard-was-it pick — always resolved locally, never pending or erroring. */
  const setEffort = useCallback(async (itemId: string, intensity: 'light' | 'moderate' | 'hard') => {
    const ctx = await createServiceContext();
    const now = Date.now();
    await updateLogItemDetailsService(ctx, itemId, { intensity }, now);
    const updated = await ctx.repos.entryItems.getById(itemId);
    if (!updated) return;
    const preview = await previewEntryItemXp(ctx, updated, now);
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === itemId ? updated : i)),
      previews: { ...s.previews, [itemId]: preview },
    }));
  }, []);

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

  return { state, setValue, submit, acceptItem, acceptAll, removeItem, discard, answerDuration, setEffort };
}
