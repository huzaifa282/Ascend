/**
 * Small builders for the append-only ledger tables, returning *unexecuted*
 * Drizzle query builders — services collect these into an array and hand
 * them to `runAtomic` so the whole write lands in one transaction.
 */
import { newId, schema } from '@ascendant/db';
import type { Db } from '@ascendant/db';
import type { StatCode } from '@ascendant/engine';

export function buildXpEvent(
  db: Db,
  opts: { at: number; amount: number; reason: string; refType?: string; refId?: string; multiplier?: number },
) {
  return db.insert(schema.xpEvents).values({
    id: newId(),
    createdAt: opts.at,
    updatedAt: opts.at,
    at: opts.at,
    amount: opts.amount,
    reason: opts.reason,
    refType: opts.refType,
    refId: opts.refId,
    multiplier: opts.multiplier ?? 1,
  });
}

export function buildStatEvent(
  db: Db,
  opts: { at: number; statCode: StatCode; statXp: number; refType?: string; refId?: string },
) {
  return db.insert(schema.statEvents).values({
    id: newId(),
    createdAt: opts.at,
    updatedAt: opts.at,
    at: opts.at,
    statCode: opts.statCode,
    statXp: opts.statXp,
    refType: opts.refType,
    refId: opts.refId,
  });
}

export function buildHpEvent(
  db: Db,
  opts: { at: number; delta: number; reason: string; cappedFrom?: number | null; refType?: string; refId?: string },
) {
  return db.insert(schema.hpEvents).values({
    id: newId(),
    createdAt: opts.at,
    updatedAt: opts.at,
    at: opts.at,
    delta: opts.delta,
    reason: opts.reason,
    cappedFrom: opts.cappedFrom,
    refType: opts.refType,
    refId: opts.refId,
  });
}

export function buildSystemMessage(
  db: Db,
  opts: { at: number; kind: 'gain' | 'ok' | 'info' | 'danger'; templateKey: string; params?: Record<string, unknown> },
) {
  return db.insert(schema.systemMessages).values({
    id: newId(),
    createdAt: opts.at,
    updatedAt: opts.at,
    at: opts.at,
    kind: opts.kind,
    templateKey: opts.templateKey,
    params: opts.params ?? {},
    read: false,
  });
}
