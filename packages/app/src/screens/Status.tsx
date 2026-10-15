import { useNavigate } from 'react-router-dom';
import { Countdown, HpSegments, RankBadge, StatFader, SystemMessage, XpRuler, XpStrip } from '@ascendant/ui';
import { xpNeeded, nextRank, trialUnlockLevel, DEFAULT_RULESET, STAT_CODES } from '@ascendant/engine';
import { useProfile } from '../hooks/useProfile';
import { useStats } from '../hooks/useStats';
import { useDailyXpSeries, useRecentSystemMessages } from '../hooks/useHistory';
import { usePenaltyZoneStatus } from '../hooks/usePenaltyZone';
import { useShieldStatus } from '../hooks/useRestShield';
import { renderMessage } from '../system/messages';

/** Status — spec 10.3. */
export function Status() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: stats } = useStats();
  const { data: dailyXp } = useDailyXpSeries(profile?.timezone ?? '', 61);
  const { data: messages } = useRecentSystemMessages(7);
  const { data: penaltyZone } = usePenaltyZoneStatus();
  const { data: shieldStatus } = useShieldStatus();

  if (!profile) return null;

  const needed = xpNeeded(profile.level, DEFAULT_RULESET);
  const next = nextRank(profile.rank);
  const unlockLevel = trialUnlockLevel(profile.rank, DEFAULT_RULESET);
  const todayXp = dailyXp?.[dailyXp.length - 1] ?? 0;

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex flex-col gap-8">
      {penaltyZone?.active && (
        <section className="rounded-lg border border-danger bg-danger-wash p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[16px] font-bold text-danger">Recovery quest</h2>
            <Countdown remainingMs={penaltyZone.deadlineMs - Date.now()} size={24} />
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono text-[13px]">
              {Math.min(penaltyZone.progress.overdueTasksCompleted, penaltyZone.tasksNeeded)} of {penaltyZone.tasksNeeded} overdue tasks cleared
            </span>
            <span className="font-mono text-[13px]">
              {Math.min(penaltyZone.progress.singleFocusSessionMinutes, penaltyZone.focusMinutesNeeded)} of {penaltyZone.focusMinutesNeeded} focus minutes
            </span>
          </div>
        </section>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-8 items-start">
        <div className="flex items-center gap-3">
          <span className="font-display font-extrabold a-numeral text-[120px] leading-none">{profile.level}</span>
          <RankBadge rank={profile.rank} size={40} />
        </div>
        <div className="flex flex-col gap-3">
          <XpRuler level={profile.level} xpIntoLevel={profile.xpIntoLevel} xpNeeded={needed} />
          {next && unlockLevel && (
            <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
              RANK {next} TRIAL UNLOCKS AT LEVEL {unlockLevel}. {Math.max(0, unlockLevel - profile.level)} LEVELS TO GO.
            </span>
          )}
          <HpSegments hp={profile.hp} />
          <div className="flex items-center gap-6">
            <Figure label="Day streak" value={shieldStatus?.usedToday ? 'FROZEN' : String(profile.streakDays)} />
            <Figure label="XP today" value={`+${todayXp}`} accent />
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">Attributes</h2>
        <div className="flex items-start justify-between flex-wrap gap-2">
          {STAT_CODES.map((code) => {
            const stat = stats?.find((s) => s.code === code);
            if (stat?.hidden) return null;
            return (
              <StatFader
                key={code}
                code={code}
                name={stat?.name ?? code}
                value={stat?.value ?? 0}
                onClick={() => navigate(`/status/stat/${code}`)}
              />
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">System feed</h2>
        <div className="rounded-lg border border-rule bg-bg p-2">
          {messages && messages.length > 0 ? (
            messages.map((m) => (
              <SystemMessage
                key={m.id}
                kind={m.kind}
                time={new Date(m.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                text={renderMessage(m.templateKey, profile.tone, m.params as Record<string, string | number>)}
              />
            ))
          ) : (
            <p className="text-text-muted p-2">Nothing yet.</p>
          )}
        </div>
      </section>

      {dailyXp && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">XP per day</h2>
          <XpStrip dailyXp={dailyXp} />
        </section>
      )}

      <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
        <button type="button" onClick={() => navigate('/status/skills')} className="hover:text-text">
          Skills
        </button>
        <button type="button" onClick={() => navigate('/status/system')} className="hover:text-text">
          System feed and Ask the System
        </button>
        <button type="button" onClick={() => navigate('/status/report')} className="hover:text-text">
          Weekly report
        </button>
      </div>
    </div>
  );
}

function Figure({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`font-display font-bold text-[20px] a-numeral ${accent ? 'text-accent' : ''}`}>{value}</span>
      <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted">{label}</span>
    </div>
  );
}
