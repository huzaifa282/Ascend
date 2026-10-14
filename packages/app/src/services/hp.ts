/** Spec 5.4 — HP mutation shared by every service that can change it. */
import { schema, type ProfileRow } from '@ascendant/db';
import { applyHpLossWithDailyCap, clampHp } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import { localDayBounds } from '../lib/localTime';
import type { ServiceContext } from './context';
import { buildHpEvent, buildSystemMessage } from './ledger';

export interface ApplyHpResult {
  writes: unknown[];
  newHp: number;
  enteredPenaltyZone: boolean;
}

/**
 * Applies an HP delta (positive = gain, negative = requested loss). Losses
 * go through the shared daily cap (spec 5.4); gains don't. Entering the
 * Penalty Zone (HP reaches 0) is recorded here; the recovery quest itself
 * and the exit flow are built in phase 7.
 */
export async function applyHpDelta(
  ctx: ServiceContext,
  profile: ProfileRow,
  delta: number,
  now: number,
  reason: string,
  ref?: { refType: string; refId: string },
): Promise<ApplyHpResult> {
  const writes: unknown[] = [];
  let appliedDelta = delta;
  let cappedFrom: number | null = null;

  if (delta < 0) {
    const { startMs, endMs } = localDayBounds(now, profile.timezone);
    const todaysLosses = await ctx.repos.events.listHpBetween(startMs, endMs);
    const alreadyLost = todaysLosses.reduce((sum, e) => sum + Math.max(0, -e.delta), 0);
    const loss = applyHpLossWithDailyCap(-delta, alreadyLost, ctx.ruleset);
    appliedDelta = -loss.appliedLoss;
    cappedFrom = loss.cappedFrom !== null ? -loss.cappedFrom : null;
  }

  const newHp = clampHp(profile.hp + appliedDelta, ctx.ruleset);
  const enteredPenaltyZone = newHp === 0 && profile.penaltyZoneSince == null;

  writes.push(
    buildHpEvent(ctx.db, { at: now, delta: appliedDelta, reason, cappedFrom, refType: ref?.refType, refId: ref?.refId }),
    ctx.db
      .update(schema.profile)
      .set({
        hp: newHp,
        penaltyZoneSince: enteredPenaltyZone ? now : profile.penaltyZoneSince,
        updatedAt: now,
      })
      .where(eq(schema.profile.id, profile.id)),
  );
  if (enteredPenaltyZone) {
    writes.push(buildSystemMessage(ctx.db, { at: now, kind: 'danger', templateKey: 'penalty_zone_entered' }));
  }

  return { writes, newHp, enteredPenaltyZone };
}
