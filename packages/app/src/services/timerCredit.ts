/** Spec 5.7 — crediting a finished (or long-enough-stopped) focus session. */
import { newId, schema } from '@ascendant/db';
import { FOCUS_SESSION_INTENSITY, sessionStatWeights, shouldCreditSession, type SessionEndReason, type StatWeights } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import type { ServiceContext } from './context';
import { logActivity } from './logActivity';

export interface StartTimerSessionInput {
  kind: 'focus' | 'break';
  plannedMinutes: number;
  taskId?: string | null;
  dailyId?: string | null;
  skillId?: string | null;
  now: number;
}

/** Creates the timer_sessions row the Rust timer's `timer:done` event is later matched against. */
export async function startTimerSession(ctx: ServiceContext, input: StartTimerSessionInput): Promise<string> {
  const id = newId();
  await ctx.db.insert(schema.timerSessions).values({
    id,
    createdAt: input.now,
    updatedAt: input.now,
    kind: input.kind,
    plannedMin: input.plannedMinutes,
    startedAt: input.now,
    endedAt: null,
    pausedMs: 0,
    taskId: input.taskId,
    dailyId: input.dailyId,
    skillId: input.skillId,
    status: 'running',
  });
  return id;
}

export interface TimerCreditInput {
  timerSessionId: string;
  focusedMinutes: number;
  endReason: SessionEndReason;
  startedAt: number;
  linkedStatWeights?: StatWeights | null;
  linkedTitle?: string | null;
  now: number;
}

export interface TimerCreditResult {
  credited: boolean;
  activityId?: string;
  xp?: number;
  levelsGained?: number;
  newLevel?: number;
}

export async function timerCredit(ctx: ServiceContext, input: TimerCreditInput): Promise<TimerCreditResult> {
  if (!shouldCreditSession(input.focusedMinutes, input.endReason, ctx.ruleset)) {
    await ctx.db
      .update(schema.timerSessions)
      .set({ status: input.endReason === 'completed' ? 'done' : 'stopped', endedAt: input.now, updatedAt: input.now })
      .where(eq(schema.timerSessions.id, input.timerSessionId));
    return { credited: false };
  }

  // Idempotent: activities.timer_session_id is UNIQUE, so a duplicate credit
  // attempt for the same session would fail loudly rather than double-pay.
  const existing = await ctx.repos.activities.getByTimerSessionId(input.timerSessionId);
  if (existing) {
    return { credited: true, activityId: existing.id, xp: existing.xp };
  }

  const result = await logActivity(ctx, {
    title: input.linkedTitle ?? 'Focus session',
    activityClass: 'deep work',
    activityType: 'deep_work',
    durationMin: input.focusedMinutes,
    intensity: FOCUS_SESSION_INTENSITY,
    distanceKm: null,
    pages: null,
    statWeights: sessionStatWeights(input.linkedStatWeights ?? null, ctx.ruleset),
    timerSessionId: input.timerSessionId,
    startedAt: input.startedAt,
    plausibilityOverride: 'ok',
    now: input.now,
  });

  await ctx.db
    .update(schema.timerSessions)
    .set({ status: input.endReason === 'completed' ? 'done' : 'stopped', endedAt: input.now, updatedAt: input.now })
    .where(eq(schema.timerSessions.id, input.timerSessionId));

  return { credited: true, activityId: result.activityId, xp: result.xp, levelsGained: result.levelsGained, newLevel: result.newLevel };
}
