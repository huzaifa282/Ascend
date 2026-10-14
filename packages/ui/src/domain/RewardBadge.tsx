import { Badge } from '../primitives/Badge';
import type { BadgeTone } from '../primitives/Badge';

export type RewardTier = 'early' | 'early_scaled' | 'on_time' | 'grace' | 'late' | 'failed' | 'rest';

export interface RewardBadgeProps {
  tier: RewardTier;
  /** Live grace percentage (0-100), shown only while tier === 'grace'. */
  gracePercent?: number;
  hpLoss?: number;
}

const TONE_BY_TIER: Record<RewardTier, BadgeTone> = {
  early: 'ok',
  early_scaled: 'ok',
  on_time: 'ok',
  grace: 'mid',
  late: 'danger',
  failed: 'danger-fill',
  rest: 'muted',
};

/** Early (ok, "up to +25%"), On time (ok, "+10%"), Grace (live %), Late (danger, "30%"), Failed (danger fill, HP), Rest (muted) — spec 9.2. */
export function RewardBadge({ tier, gracePercent, hpLoss }: RewardBadgeProps) {
  const label = (() => {
    switch (tier) {
      case 'early':
        return 'UP TO +25%';
      case 'early_scaled':
        return '+10% TO +25%';
      case 'on_time':
        return '+10%';
      case 'grace':
        return `NOW ${gracePercent ?? 100}%`;
      case 'late':
        return '30%';
      case 'failed':
        return hpLoss != null ? `-${hpLoss} HP` : 'FAILED';
      case 'rest':
        return 'FROZEN';
    }
  })();

  return <Badge tone={TONE_BY_TIER[tier]}>{label}</Badge>;
}
