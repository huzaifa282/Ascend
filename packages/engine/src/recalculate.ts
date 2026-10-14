/**
 * Replays the append-only event ledger into profile/stat totals (spec
 * section 4: "totals are derived and cached... but can always be recomputed
 * by replaying the ledger with the current ruleset"). Settings >
 * "Recalculate from history" calls this and must reproduce the cached
 * totals exactly, for the same events and ruleset.
 */
import { applyXpGain, rankForLevel } from './levels';
import type { Ruleset } from './ruleset';
import type { EpochMs, Rank, StatCode } from './types';

export interface LedgerXpEvent {
  atMs: EpochMs;
  amount: number;
}

export interface LedgerStatEvent {
  atMs: EpochMs;
  statCode: StatCode;
  statXp: number;
}

export interface Ledger {
  xpEvents: LedgerXpEvent[];
  statEvents: LedgerStatEvent[];
}

export interface RecalculateResult {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  /** The level-derived rank, before any un-passed rank trial cap is applied. */
  rawRank: Rank;
  statXp: Partial<Record<StatCode, number>>;
}

export function recalculate(ledger: Ledger, ruleset: Ruleset): RecalculateResult {
  const xpEvents = [...ledger.xpEvents].sort((a, b) => a.atMs - b.atMs);

  let level = 1;
  let xpIntoLevel = 0;
  let totalXp = 0;
  for (const event of xpEvents) {
    totalXp += event.amount;
    const applied = applyXpGain({ level, xpIntoLevel }, event.amount, ruleset);
    level = applied.level;
    xpIntoLevel = applied.xpIntoLevel;
  }

  const statXp: Partial<Record<StatCode, number>> = {};
  for (const event of [...ledger.statEvents].sort((a, b) => a.atMs - b.atMs)) {
    statXp[event.statCode] = Math.max(0, (statXp[event.statCode] ?? 0) + event.statXp);
  }

  return {
    totalXp,
    level,
    xpIntoLevel,
    rawRank: rankForLevel(level, ruleset),
    statXp,
  };
}
