import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Countdown, QuestRow, RewardBadge, Tabs } from '@ascendant/ui';
import type { RewardTier } from '@ascendant/ui';
import {
  baseReward,
  computeAmbition,
  taskEstDefaultMinutes,
  type Difficulty,
  type DailySize,
} from '@ascendant/engine';
import { DEFAULT_RULESET } from '@ascendant/engine';
import { newId } from '@ascendant/db';
import { useProfile } from '../hooks/useProfile';
import { useOpenTasks, useCompleteTask, useCreateTask } from '../hooks/useTasks';
import { useActiveDailies, useCompleteDaily, useCreateDaily, useTodaysDailyCompletions } from '../hooks/useDailies';
import { useShieldStatus } from '../hooks/useRestShield';
import { resolveRepos } from '../hooks/useRepos';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldDialog } from '../components/ShieldDialog';

const DAILY_SIZES: DailySize[] = ['small', 'medium', 'large', 'xlarge'];

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
  const createTask = useCreateTask();
  const createDaily = useCreateDaily();
  const restToday = Boolean(shieldStatus?.usedToday);

  const queryClient = useQueryClient();
  const createMainQuest = useMutation({
    mutationFn: async (title: string) => {
      const repos = await resolveRepos();
      const now = Date.now();
      await repos.mainQuests.create({
        id: newId(),
        createdAt: now,
        updatedAt: now,
        title,
        description: null,
        targetDate: null,
        status: 'open',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mainQuests'] }),
  });

  const [addingDaily, setAddingDaily] = useState(false);
  const [dailyTitle, setDailyTitle] = useState('');
  const [dailySize, setDailySize] = useState<DailySize>('medium');
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [addingMain, setAddingMain] = useState(false);
  const [mainTitle, setMainTitle] = useState('');

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
                <Button variant="default" onClick={() => setAddingDaily((v) => !v)}>
                  + ADD
                </Button>
                {!restToday && (
                  <Button
                    variant="default"
                    onClick={() => setShieldDialogOpen(true)}
                    title="Freeze your streak for today and skip dailies without failing them."
                  >
                    REST TODAY
                  </Button>
                )}
              </div>
            </div>
            {addingDaily && (
              <div className="flex items-center gap-2 px-4 py-3 a-row">
                <input
                  autoFocus
                  value={dailyTitle}
                  onChange={(e) => setDailyTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && dailyTitle.trim()) {
                      createDaily.mutate({ title: dailyTitle.trim(), size: dailySize });
                      setDailyTitle('');
                      setAddingDaily(false);
                    }
                    if (e.key === 'Escape') setAddingDaily(false);
                  }}
                  placeholder="Daily title…"
                  className="flex-1 h-touch rounded-md border border-rule bg-surface px-3 font-display text-[14px]"
                />
                <select
                  value={dailySize}
                  onChange={(e) => setDailySize(e.target.value as DailySize)}
                  className="h-touch rounded-md border border-rule bg-surface px-2 font-mono text-[11px] uppercase tracking-[.1em]"
                >
                  {DAILY_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  disabled={!dailyTitle.trim()}
                  onClick={() => {
                    createDaily.mutate({ title: dailyTitle.trim(), size: dailySize });
                    setDailyTitle('');
                    setAddingDaily(false);
                  }}
                >
                  ADD
                </Button>
              </div>
            )}
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
            {(!dailies || dailies.length === 0) && !addingDaily && (
              <p className="text-text-muted p-4">No dailies yet — add one to start building a streak.</p>
            )}
          </section>

          <ShieldDialog open={shieldDialogOpen} onClose={() => setShieldDialogOpen(false)} />

          <section className="rounded-lg border border-rule bg-bg a-card-clip">
            <div className="h-[52px] flex items-center justify-between px-4 border-b border-rule">
              <h2 className="font-display heading-m text-[18px] font-semibold a-heading">Tasks with deadlines</h2>
              <Button variant="default" onClick={() => setAddingTask((v) => !v)}>
                + ADD
              </Button>
            </div>
            {addingTask && (
              <div className="flex items-center gap-2 px-4 py-3 a-row">
                <input
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && taskTitle.trim()) {
                      createTask.mutate(taskTitle.trim());
                      setTaskTitle('');
                      setAddingTask(false);
                    }
                    if (e.key === 'Escape') setAddingTask(false);
                  }}
                  placeholder="Task title… (add a due date from the command bar or the task sheet)"
                  className="flex-1 h-touch rounded-md border border-rule bg-surface px-3 font-display text-[14px]"
                />
                <Button
                  variant="primary"
                  disabled={!taskTitle.trim()}
                  onClick={() => {
                    createTask.mutate(taskTitle.trim());
                    setTaskTitle('');
                    setAddingTask(false);
                  }}
                >
                  ADD
                </Button>
              </div>
            )}
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
          <p className="text-text-muted">Coming soon — a weekly view of your tasks and dailies.</p>
        </section>
      )}

      {tab === 'main' && (
        <section className="rounded-lg border border-rule bg-bg a-card-clip">
          <div className="h-[52px] flex items-center justify-end px-4 border-b border-rule">
            <Button variant="default" onClick={() => setAddingMain((v) => !v)}>
              + ADD
            </Button>
          </div>
          {addingMain && (
            <div className="flex items-center gap-2 px-4 py-3 a-row">
              <input
                autoFocus
                value={mainTitle}
                onChange={(e) => setMainTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && mainTitle.trim()) {
                    createMainQuest.mutate(mainTitle.trim());
                    setMainTitle('');
                    setAddingMain(false);
                  }
                  if (e.key === 'Escape') setAddingMain(false);
                }}
                placeholder="Main quest title…"
                className="flex-1 h-touch rounded-md border border-rule bg-surface px-3 font-display text-[14px]"
              />
              <Button
                variant="primary"
                disabled={!mainTitle.trim()}
                onClick={() => {
                  createMainQuest.mutate(mainTitle.trim());
                  setMainTitle('');
                  setAddingMain(false);
                }}
              >
                ADD
              </Button>
            </div>
          )}
          {(mainQuests ?? []).map((q) => (
            <div key={q.id} className="flex flex-col gap-1 px-4 py-3 a-row">
              <span className="font-display text-[15px]">{q.title}</span>
              {q.description && <span className="font-mono text-[11px] text-text-muted">{q.description}</span>}
            </div>
          ))}
          {(!mainQuests || mainQuests.length === 0) && !addingMain && (
            <p className="text-text-muted p-4">No main quests yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
