/** Spec 5.5 — completing a task with deadline reward tiers. */
import { newId, runAtomic, schema } from '@ascendant/db';
import {
  baseReward,
  computeAmbition,
  evaluateTaskCompletion,
  failedTaskHpLossMagnitude,
  rescheduleMultiplier,
  statValue,
  taskEstDefaultMinutes,
  type Difficulty,
  type StatCode,
} from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import type { ServiceContext } from './context';
import { applyXpToProfile } from './profileXp';
import { applyHpDelta } from './hp';
import { buildSystemMessage } from './ledger';

export interface CompleteTaskResult {
  tier: string;
  xp: number;
  levelsGained: number;
  newLevel: number;
}

export async function completeTask(ctx: ServiceContext, taskId: string, now: number): Promise<CompleteTaskResult> {
  const task = await ctx.repos.tasks.getById(taskId);
  if (!task) throw new Error(`completeTask: task ${taskId} not found`);
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('completeTask: no profile row');

  const difficulty = task.difficulty as Difficulty;
  const estMinutes = task.estMinutes ?? taskEstDefaultMinutes(difficulty, ctx.ruleset);
  const dueAt = task.dueAt ?? now; // tasks without a deadline are always "on time"
  const windowMinutes = Math.max(1, (dueAt - task.windowStart) / 60_000);
  const { ambition } = computeAmbition(estMinutes, windowMinutes, ctx.ruleset);
  const base = baseReward(difficulty, ambition, ctx.ruleset);

  const completionTiered = evaluateTaskCompletion(
    { dueAtMs: dueAt, completedAtMs: now, windowStartMs: task.windowStart, baseRewardAmount: base },
    ctx.ruleset,
  );
  // Spec 5.5: "each later [reschedule] multiplies the eventual reward" —
  // applied once, here, at completion, not at reschedule time.
  const rescheduleFactor = rescheduleMultiplier(task.rescheduleCount, ctx.ruleset);
  const completion = { ...completionTiered, xp: Math.round(completionTiered.xp * rescheduleFactor) };

  const writes: unknown[] = [
    ctx.db
      .update(schema.tasks)
      .set({
        status: completion.tier === 'failed' ? 'failed' : 'done',
        completedAt: now,
        rewardTier: completion.tier,
        xpAwarded: completion.xp,
        updatedAt: now,
      })
      .where(eq(schema.tasks.id, taskId)),
  ];

  if (completion.tier === 'failed') {
    const hpLoss = failedTaskHpLossMagnitude(difficulty, ctx.ruleset);
    const hp = await applyHpDelta(ctx, profile, -hpLoss, now, 'failed_task', {
      refType: 'task',
      refId: taskId,
    });
    writes.push(...hp.writes, buildSystemMessage(ctx.db, { at: now, kind: 'danger', templateKey: 'deadline_missed', params: { hp: hpLoss } }));
    await runAtomic(ctx.sql, writes as Parameters<typeof runAtomic>[1]);
    return { tier: completion.tier, xp: 0, levelsGained: 0, newLevel: profile.level };
  }

  const xpApplied = await applyXpToProfile(ctx, profile, completion.xp, ctx.ruleset, now, 'task', {
    refType: 'task',
    refId: taskId,
  });
  writes.push(
    ...xpApplied.writes,
    buildSystemMessage(ctx.db, { at: now, kind: 'ok', templateKey: 'quest_done', params: { title: task.title, xp: completion.xp } }),
  );

  const statWeights = (task.statWeights as Partial<Record<StatCode, number>>) ?? { DIS: 1 };
  for (const [code, weight] of Object.entries(statWeights) as [StatCode, number][]) {
    const statXpGain = Math.round(completion.xp * weight);
    if (statXpGain === 0) continue;
    const statRow = await ctx.repos.stats.getByCode(code);
    if (!statRow) continue;
    const newStatXp = statRow.statXp + statXpGain;
    writes.push(
      ctx.db.insert(schema.statEvents).values({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        at: now,
        statCode: code,
        statXp: statXpGain,
        refType: 'task',
        refId: taskId,
      }),
      ctx.db
        .update(schema.stats)
        .set({ statXp: newStatXp, value: statValue(newStatXp, ctx.ruleset), lastTrainedAt: now, updatedAt: now })
        .where(eq(schema.stats.id, statRow.id)),
    );
  }

  await runAtomic(ctx.sql, writes as Parameters<typeof runAtomic>[1]);
  return { tier: completion.tier, xp: completion.xp, levelsGained: xpApplied.levelsGained, newLevel: xpApplied.newLevel };
}
