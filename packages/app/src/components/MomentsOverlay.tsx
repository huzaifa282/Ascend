import { Button, HpSegments, LevelRoll, RankBadge } from '@ascendant/ui';
import { DEFAULT_RULESET } from '@ascendant/engine';
import { useMomentsStore } from '../stores/useMomentsStore';

/**
 * Spec 10.9 — level up / rank up / title earned, full-window takeovers shown
 * one at a time (the store is a FIFO queue; Continue pops to the next).
 */
export function MomentsOverlay() {
  const moment = useMomentsStore((s) => s.queue[0]);
  const dismissCurrent = useMomentsStore((s) => s.dismissCurrent);

  if (!moment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center gap-6">
      {moment.kind === 'levelUp' && (
        <>
          <span className="font-mono text-[13px] uppercase tracking-[.2em] text-accent">Level up</span>
          <LevelRoll from={moment.fromLevel} to={moment.toLevel} size={280} />
          {moment.hpRestored && (
            <span className="font-mono text-[12px] uppercase tracking-[.1em] text-ok">HP restored</span>
          )}
          <p className="sr-only">
            Level {moment.toLevel}. {moment.hpRestored ? 'HP restored.' : ''}
          </p>
        </>
      )}

      {moment.kind === 'rankUp' && (
        <>
          <span className="font-mono text-[13px] uppercase tracking-[.2em] text-accent">Rank up</span>
          <div className="flex items-center gap-6">
            <RankBadge rank={moment.fromRank} locked size={56} />
            <span className="font-display text-[32px] text-text-muted">&rarr;</span>
            <RankBadge rank={moment.toRank} size={72} />
          </div>
          <p className="font-display text-[18px]">You are now Rank {moment.toRank}.</p>
        </>
      )}

      {moment.kind === 'titleEarned' && (
        <>
          <span className="font-mono text-[13px] uppercase tracking-[.2em] text-accent">Title earned</span>
          <p className="font-display text-[24px] font-bold">{moment.name}</p>
          <p className="font-mono text-[12px] text-text-muted max-w-sm text-center">{moment.howEarned}</p>
        </>
      )}

      {moment.kind === 'penaltyZoneCleared' && (
        <>
          <span className="font-mono text-[13px] uppercase tracking-[.2em] text-ok">Penalty zone cleared</span>
          <p className="font-display text-[20px]">Recovery complete.</p>
          <HpSegments hp={DEFAULT_RULESET.penaltyZone.exitHp} max={DEFAULT_RULESET.hp.max} />
        </>
      )}

      <Button variant="primary" onClick={dismissCurrent}>
        Continue
      </Button>
    </div>
  );
}
