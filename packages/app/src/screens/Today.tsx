import { ClockCard, LevelChip, MusicCard, TaskList } from '@ascendant/ui';
import { xpNeeded, DEFAULT_RULESET } from '@ascendant/engine';
import { useNavigate } from 'react-router-dom';
import { useOpenTasks, useCompleteTask } from '../hooks/useTasks';
import { useProfile } from '../hooks/useProfile';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });

/**
 * Today (home) — spec 10.2. Exactly: header row, two-column grid
 * (ClockCard+MusicCard / TaskList), one quiet link. The clock and music
 * cards show a static idle state until phase 5 wires the Rust timer/media
 * backends; the task list is wired to the real database already.
 */
export function Today() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: openTasks } = useOpenTasks();
  const completeTask = useCompleteTask();

  const now = new Date();
  const label = `${WEEKDAY_FORMAT.format(now).toUpperCase()} ${DATE_FORMAT.format(now).toUpperCase()}`;
  const levelingEnabled = profile?.levelingEnabled ?? true;
  const name = profile?.name ?? '';

  const tasks = (openTasks ?? [])
    .slice()
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))
    .map((t) => ({
      id: t.id,
      title: t.title,
      time: t.dueAt ? new Date(t.dueAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : undefined,
      done: false,
      xp: undefined, // the exact award depends on completion time; shown once it's computed at completion.
    }));

  return (
    <div className="max-w-[1000px] mx-auto px-10 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted mb-1">{label}</p>
          <h1 className="font-display text-[32px] leading-[38px] font-bold a-heading">
            {greetingFor(now.getHours())}{name ? `, ${name}` : ''}.
          </h1>
        </div>
        {profile &&
          (levelingEnabled ? (
            <LevelChip
              level={profile.level}
              rank={profile.rank}
              xpIntoLevel={profile.xpIntoLevel}
              xpNeeded={xpNeeded(profile.level, DEFAULT_RULESET)}
              onClick={() => navigate('/status')}
            />
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
              2H 10M FOCUSED TODAY
            </span>
          ))}
      </div>

      <div className="grid grid-cols-[1fr_1.1fr] gap-6">
        <div className="flex flex-col gap-6">
          <ClockCard state="idle" elapsedMin={0} totalMin={25} onOpen={() => {}} onPlayPause={() => {}} />
          <MusicCard nothingPlaying />
        </div>
        <TaskList
          tasks={tasks}
          levelingEnabled={levelingEnabled}
          onToggle={(id) => completeTask.mutate(id)}
          onAddTask={() => {}}
          emptyState={<p className="text-text-muted text-center">Nothing planned. Add a task or log something.</p>}
        />
      </div>

      {levelingEnabled && (
        <p className="mt-4 font-mono text-[11px] text-text-muted">Stats, quests and history are in the sidebar &gt;</p>
      )}
    </div>
  );
}
