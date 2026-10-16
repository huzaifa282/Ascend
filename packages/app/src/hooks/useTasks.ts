import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newId } from '@ascendant/db';
import {
  checkPenaltyZoneRecovery,
  createServiceContext,
  completeTask as completeTaskService,
  playFeedbackSound,
} from '../services';
import { resolveRepos } from './useRepos';
import { useMomentsStore } from '../stores/useMomentsStore';
import { useRecentlyAddedStore } from '../stores/useRecentlyAddedStore';
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

/** Minimal "+ Add" path for Quests (spec 10.5) — no due date/difficulty picker, just a title; use the command bar or the task sheet for anything more specific. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const repos = await resolveRepos();
      const now = Date.now();
      const id = newId();
      await repos.tasks.create({
        id,
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
      return id;
    },
    onSuccess: (id) => {
      useRecentlyAddedStore.getState().mark(id);
      void playFeedbackSound('confirm');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
        void playFeedbackSound('levelUp');
      } else if (result.tier !== 'failed') {
        void playFeedbackSound('complete');
      }
      if (result.recoveryCleared) {
        pushMoment({ kind: 'penaltyZoneCleared' });
        void playFeedbackSound('cleared');
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
