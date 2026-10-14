import { newId, schema, type Db, type ProfileRow } from '@ascendant/db';
import { applyXpGain, rankForLevel, trialUnlockLevel, type Ruleset } from '@ascendant/engine';
import { eq } from 'drizzle-orm';
import { buildXpEvent } from './ledger';
import type { ServiceContext } from './context';

export interface ApplyXpResult {
  writes: unknown[];
  newLevel: number;
  newXpIntoLevel: number;
  newTotalXp: number;
  levelsGained: number;
  trialUnlocked: boolean;
}

/**
 * Shared by every service that awards XP: applies the engine's level-up
 * math, builds the xp_event row and the profile update (spec 5.3: "carry
 * over excess XP, restore HP to max" on level-up), and unlocks a rank trial
 * the moment the level crosses into the next band — title checks happen
 * one layer up, where the caller has the full confirmed-item context.
 */
export async function applyXpToProfile(
  ctx: ServiceContext,
  profile: ProfileRow,
  xpAmount: number,
  ruleset: Ruleset,
  at: number,
  reason: string,
  ref?: { refType: string; refId: string },
): Promise<ApplyXpResult> {
  const db: Db = ctx.db;
  const leveled = applyXpGain({ level: profile.level, xpIntoLevel: profile.xpIntoLevel }, xpAmount, ruleset);
  const writes: unknown[] = [
    buildXpEvent(db, { at, amount: xpAmount, reason, refType: ref?.refType, refId: ref?.refId }),
    db
      .update(schema.profile)
      .set({
        level: leveled.level,
        xpIntoLevel: leveled.xpIntoLevel,
        totalXp: profile.totalXp + xpAmount,
        updatedAt: at,
        ...(leveled.levelsGained > 0 ? { hp: ruleset.hp.max } : {}),
      })
      .where(eq(schema.profile.id, profile.id)),
  ];

  // Spec 5.3: "Reaching the first level of the next band unlocks a 7-day
  // rank trial." Only unlock once per band crossing.
  let trialUnlocked = false;
  if (leveled.levelsGained > 0) {
    const unlockLevel = trialUnlockLevel(profile.rank, ruleset);
    if (unlockLevel !== null && profile.level < unlockLevel && leveled.level >= unlockLevel) {
      const existing = await ctx.repos.rankTrials.getActive();
      if (!existing) {
        trialUnlocked = true;
        writes.push(
          db.insert(schema.rankTrials).values({
            id: newId(),
            createdAt: at,
            updatedAt: at,
            fromRank: profile.rank,
            toRank: rankForLevel(unlockLevel, ruleset),
            startedAt: at,
            days: [],
            status: 'active',
          }),
        );
      }
    }
  }

  return {
    writes,
    newLevel: leveled.level,
    newXpIntoLevel: leveled.xpIntoLevel,
    newTotalXp: profile.totalXp + xpAmount,
    levelsGained: leveled.levelsGained,
    trialUnlocked,
  };
}
