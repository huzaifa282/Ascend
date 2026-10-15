/**
 * Spec 5.4 / 10.6 — Penalty Zone status and recovery. Entering is handled
 * where HP hits 0 (`hp.ts`'s `applyHpDelta`, `dayClose`'s HP update); this
 * module is the other half: checking whether either recovery path (clear 3
 * already-overdue tasks, or one 60-minute focus session) has been completed
 * since Penalty Zone began, and exiting it when it has.
 */
import { runAtomic, schema } from '@ascendant/db';
import { isRecoveryComplete, isRecoveryExpired, penaltyZoneExitHp, type RecoveryProgress } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import type { ServiceContext } from './context';
import { buildSystemMessage } from './ledger';

export interface PenaltyZoneStatus {
  active: boolean;
  since: number;
  progress: RecoveryProgress;
  tasksNeeded: number;
  focusMinutesNeeded: number;
  deadlineMs: number;
  expired: boolean;
}

async function getRecoveryProgress(ctx: ServiceContext, sinceMs: number): Promise<RecoveryProgress> {
  const [overdueTasksCompleted, singleFocusSessionMinutes] = await Promise.all([
    ctx.repos.tasks.countCompletedOverdueSince(sinceMs),
    ctx.repos.activities.maxFocusSessionMinutesSince(sinceMs),
  ]);
  return { overdueTasksCompleted, singleFocusSessionMinutes };
}

export async function getPenaltyZoneStatus(ctx: ServiceContext, now: number): Promise<PenaltyZoneStatus | null> {
  const profile = await ctx.repos.profile.get();
  if (!profile?.penaltyZoneSince) return null;

  const progress = await getRecoveryProgress(ctx, profile.penaltyZoneSince);
  const windowMs = ctx.ruleset.penaltyZone.recoveryWindowHours * 60 * 60 * 1000;

  return {
    active: true,
    since: profile.penaltyZoneSince,
    progress,
    tasksNeeded: ctx.ruleset.penaltyZone.recoveryTasksNeeded,
    focusMinutesNeeded: ctx.ruleset.penaltyZone.recoveryFocusMinutes,
    deadlineMs: profile.penaltyZoneSince + windowMs,
    expired: isRecoveryExpired(profile.penaltyZoneSince, now, ctx.ruleset),
  };
}

export interface CheckRecoveryResult {
  cleared: boolean;
}

/** Call after anything that could complete a recovery path (completeTask, timerCredit). */
export async function checkPenaltyZoneRecovery(ctx: ServiceContext, now: number): Promise<CheckRecoveryResult> {
  const profile = await ctx.repos.profile.get();
  if (!profile?.penaltyZoneSince) return { cleared: false };

  const progress = await getRecoveryProgress(ctx, profile.penaltyZoneSince);
  if (!isRecoveryComplete(progress, ctx.ruleset)) return { cleared: false };

  await runAtomic(ctx.sql, [
    ctx.db
      .update(schema.profile)
      .set({ hp: penaltyZoneExitHp(ctx.ruleset), penaltyZoneSince: null, updatedAt: now })
      .where(eq(schema.profile.id, profile.id)),
    buildSystemMessage(ctx.db, { at: now, kind: 'ok', templateKey: 'penalty_zone_exited', params: {} }),
  ]);
  return { cleared: true };
}
