/** Spec 5.4 — rest-day shields (2 per calendar month). */
import { newId } from '@ascendant/db';
import { canUseShield } from '@ascendant/engine';
import { localDateString, localMonthString } from '../lib/localTime';
import type { ServiceContext } from './context';

export type UseShieldResult =
  | { ok: true }
  | { ok: false; reason: 'none_remaining' | 'day_already_closed' };

export async function useShield(ctx: ServiceContext, now: number): Promise<UseShieldResult> {
  const profile = await ctx.repos.profile.get();
  if (!profile) throw new Error('useShield: no profile row');

  const today = localDateString(now, profile.timezone);
  const month = localMonthString(today);

  // "Cannot be used retroactively for a day already closed."
  if (profile.lastDayCloseDate && today <= profile.lastDayCloseDate) {
    return { ok: false, reason: 'day_already_closed' };
  }

  const usedThisMonth = await ctx.repos.shields.listForMonth(month);
  if (!canUseShield(usedThisMonth.length, ctx.ruleset)) {
    return { ok: false, reason: 'none_remaining' };
  }

  await ctx.repos.shields.create({
    id: newId(),
    createdAt: now,
    updatedAt: now,
    month,
    usedOn: today,
  });
  return { ok: true };
}
