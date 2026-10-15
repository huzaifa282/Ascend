import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Countdown, QuestRow, RewardBadge, Tabs } from '@ascendant/ui';
import type { RewardTier } from '@ascendant/ui';
import {
  baseReward,
  computeAmbition,
  taskEstDefaultMinutes,
  type Difficulty,
} from '@ascendant/engine';
import { DEFAULT_RULESET } from '@ascendant/engine';
import { useProfile } from '../hooks/useProfile';
import { useOpenTasks, useCompleteTask } from '../hooks/useTasks';
import { useActiveDailies, useCompleteDaily, useTodaysDailyCompletions } from '../hooks/useDailies';
import { useShieldStatus } from '../hooks/useRestShield';
import { resolveRepos } from '../hooks/useRepos';
import { useQuery } from '@tanstack/react-query';
import { ShieldDialog } from '../components/ShieldDialog';

type QuestTab = 'today' | 'week' | 'main';

function rewardTierFor(dueAt: number | null, windowStart: number, difficulty: Difficulty, now: number): { tier: RewardTier; xp: number } {
  if (!dueAt) return { tier: 'on_time', xp: 0 };
  const estMinutes = taskEstDefaultMinutes(difficulty, DEFAULT_RULESET);
  const windowMinutes = Math.max(1, (dueAt - windowStart) / 60_000);
  const { ambition } = computeAmbition(estMinutes, windowMinutes, DEFAULT_RULESET);
  const base = baseReward(difficulty, ambition, DEFAULT_RULESET);
  const remainingMs = dueAt - now;
  const r = remainingMs / (dueAt - windowStart);
  if (r >= 0.5) return { tier: 'early', xp: Math.round(base * 1.25) };
  if (r >= 0.1) return { tier: 'early_scaled', xp: Math.round(base * 1.1) };
  if (r >= 0) return { tier: 'on_time', xp: Math.round(base * 1.1) };
  return { tier: 'late', xp: Math.round(base * 0.3) };
}

/** Quests — spec 10.5. Today tab is fully wired; This week / Main quests are a lighter first pass. */
export function Quests() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<QuestTab>('today');
  const { data: profile } = useProfile();
  const { data: dailies } = useActiveDailies();
  const { data: completions } = useTodaysDailyCompletions(profile?.timezone ?? '');
  const { data: openTasks } = useOpenTasks();
  const { data: mainQuests } = useQuery({
    queryKey: ['mainQuests'],
    queryFn: async () => (await resolveRepos()).mainQuests.list(),
  });
  const { data: shieldStatus } = useShieldStatus();
  const [shieldDialogOpen, setShieldDialogOpen] = useState(false);
  const completeDaily = useCompleteDaily();
  const completeTask = useCompleteTask();
  const restToday = Boolean(shieldStatus?.usedToday);

  const now = Date.now();
  const doneDailyIds = new Set((completions ?? []).map((c) => c.dailyId));
  const doneCount = doneDailyIds.size;

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex flex-col gap-6">
      <h1 className="font-display text-[28px] leading-8 font-bold a-heading">Quests</h1>
      <Tabs
        aria-label="Quest views"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'main', label: 'Main quests' },
        ]}
      />

      {tab === 'today' && (
        <div className="flex flex-col gap-6">
          {restToday && (
            <div className="rounded-lg border border-rule bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
              Rest day — a shield is covering today. Your streak is frozen and dailies can&apos;t fail.
            </div>
          )}

          <section className="rounded-lg border border-rule bg-bg a-card-clip">
            <div className="h-[52px] flex items-center justify-between px-4 border-b border-rule">
              <h2 className="font-display heading-m text-[18px] font-semibold a-heading">Dailies</h2>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
                  {doneCount} OF {dailies?.length ?? 0} DONE
                </span>
                {!restToday && (
                  <Button variant="default" onClick={() => setShieldDialogOpen(true)}>
                    REST TODAY
                  </Button>
                )}
              </div>
            </div>
            {(dailies ?? []).map((d) => (
              <QuestRow
                key={d.id}
                title={d.title}
                done={doneDailyIds.has(d.id) || restToday}
                xp={d.xp}
                onToggle={restToday ? undefined : () => completeDaily.mutate(d.id)}
                right={restToday ? <Badge tone="muted">REST / FROZEN</Badge> : undefined}
              />
            ))}
          </section>

          <ShieldDialog open={shieldDialogOpen} onClose={() => setShieldDialogOpen(false)} />

          <section className="rounded-lg border border-rule bg-bg a-card-clip">
            <div className="h-[52px] flex items-center px-4 border-b border-rule">
              <h2 className="font-display heading-m text-[18px] font-semibold a-heading">Tasks with deadlines</h2>
            </div>
            {(openTasks ?? []).map((task) => {
              const reward = rewardTierFor(task.dueAt, task.windowStart, task.difficulty as Difficulty, now);
              const late = task.dueAt != null && task.dueAt < now;
              return (
                <div key={task.id} className={`flex items-center gap-3 px-4 py-3 a-row ${late ? 'bg-danger-wash' : ''}`}>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className={`font-display text-[15px] truncate ${late ? 'text-danger' : ''}`}>{task.title}</span>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-pill ${i < task.difficulty ? 'bg-text' : 'bg-rule'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {task.dueAt && <Countdown remainingMs={task.dueAt - now} size={24} />}
                  <RewardBadge tier={reward.tier} />
                  <Button variant="default" onClick={() => navigate(`/quests/${task.id}`)}>
                    RESCHEDULE
                  </Button>
                  <Button variant="primary" onClick={() => completeTask.mutate(task.id)}>
                    DONE
                  </Button>
                </div>
              );
            })}
            {(!openTasks || openTasks.length === 0) && (
              <p className="text-text-muted p-4">Nothing with a deadline right now.</p>
            )}
          </section>
        </div>
      )}

      {tab === 'week' && (
        <section className="rounded-lg border border-rule bg-bg p-4">
          <p className="text-text-muted">This week&rsquo;s view groups the same open tasks by due date (phase 7 polish).</p>
        </section>
      )}

      {tab === 'main' && (
        <section className="rounded-lg border border-rule bg-bg a-card-clip">
          {(mainQuests ?? []).map((q) => (
            <div key={q.id} className="flex flex-col gap-1 px-4 py-3 a-row">
              <span className="font-display text-[15px]">{q.title}</span>
              {q.description && <span className="font-mono text-[11px] text-text-muted">{q.description}</span>}
            </div>
          ))}
          {(!mainQuests || mainQuests.length === 0) && <p className="text-text-muted p-4">No main quests yet.</p>}
        </section>
      )}
    </div>
  );
}
