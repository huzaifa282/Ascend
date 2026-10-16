import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { xpNeeded, DEFAULT_RULESET } from '@ascendant/engine';
import { Countdown, Dial, HpSegments, IconButton, LevelChip, PlayButton, QuestRow } from '@ascendant/ui';
import { useOpenTasks, useProfile, usePatchWidgetSettings, useTimer, useWidgetSettings } from '../hooks';
import { CommandBarContainer } from '../components/CommandBarContainer';
import { MusicCardContainer } from '../components/MusicCardContainer';

function openMain(route?: string): void {
  void invoke('open_main', { route });
}

/**
 * The companion widget (350x640, spec 11.5): title row, level row -> Status,
 * timer row -> Focus mode, player, next deadline + one quest, command bar.
 * No router here — every "open" action asks Rust to show/focus `main` and
 * navigate it, rather than rendering a route locally.
 */
export function WidgetContent() {
  const { data: profile } = useProfile();
  const { data: openTasks } = useOpenTasks();
  const { data: widgetSettings } = useWidgetSettings();
  const patchWidgetSettings = usePatchWidgetSettings();
  const { state: timer, start, pause, resume, stop, addFiveMinutes } = useTimer();
  // Default is pinned: the window floats on top of everything. Unpinning
  // sits it below every other normal window instead (still above the
  // desktop) — see commands/desktop_anchor.rs.
  const [pinned, setPinned] = useState(true);

  // Rust's setup() already applies the saved mode to this window before it's
  // ever shown, so the first resolution here just re-sends the same value —
  // harmless, since this is a plain, cheap Tauri window call now.
  useEffect(() => {
    if (!widgetSettings) return;
    setPinned(widgetSettings.alwaysOnTop);
    void invoke('set_companion_anchor', { label: 'widget', anchor: !widgetSettings.alwaysOnTop });
  }, [widgetSettings]);

  // Optimistic local flip for instant icon feedback; the effect above sends
  // the actual native command once the DB write round-trips back through
  // `widgetSettings`.
  const togglePinned = () => {
    setPinned((p) => !p);
    patchWidgetSettings.mutate({ alwaysOnTop: !pinned });
  };

  const nextTask = (openTasks ?? [])
    .filter((t) => t.dueAt != null)
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity))[0];

  const levelingEnabled = profile?.levelingEnabled ?? true;
  const elapsedMin = (timer.totalS - timer.leftS) / 60;
  const totalMin = timer.totalS / 60 || 25;
  const xpSoFar = Math.round(elapsedMin); // 1 XP/min placeholder until credited; the real total lands on timer:done.
  const timerIdle = timer.phase === 'idle';

  return (
    <div
      className="h-screen w-screen flex flex-col bg-bg border border-rule rounded-lg overflow-hidden overflow-x-hidden text-text"
      style={{ opacity: (widgetSettings?.opacity ?? 100) / 100 }}
    >
      <div
        data-tauri-drag-region="deep"
        className="h-10 flex items-center justify-between px-3 flex-none cursor-move"
      >
        <span className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">ASCENDANT</span>
        <div className="flex items-center gap-1">
          <IconButton icon="ext" aria-label="Open" size={16} onClick={() => openMain('/today')} />
          <IconButton
            icon="pin"
            aria-label={pinned ? 'Unpin from top' : 'Pin to top'}
            size={16}
            className={pinned ? 'text-on-accent bg-accent hover:text-on-accent hover:bg-accent' : undefined}
            onClick={togglePinned}
          />
          <IconButton icon="collapse" aria-label="Collapse" size={16} onClick={() => void invoke('toggle_companion_size')} />
          <IconButton icon="x" aria-label="Close" size={16} onClick={() => void getCurrentWindow().hide()} />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-4 overflow-y-auto overflow-x-hidden flex-1">
        {profile &&
          (levelingEnabled ? (
            <div className="flex flex-col gap-2">
              <LevelChip
                level={profile.level}
                rank={profile.rank}
                xpIntoLevel={profile.xpIntoLevel}
                xpNeeded={xpNeeded(profile.level, DEFAULT_RULESET)}
                onClick={() => openMain('/status')}
              />
              <HpSegments hp={profile.hp} small />
            </div>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">FOCUSED TODAY</span>
          ))}

        <button type="button" onClick={() => openMain('/focus')} className="flex flex-col items-center gap-2">
          <Dial size={116} elapsedMin={elapsedMin} totalMin={totalMin} onBreak={timer.kind === 'break'} />
          <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted truncate max-w-full">
            {timerIdle ? 'NOTHING RUNNING' : `WORKING ON ${timer.taskRef ?? 'FOCUS'}`}
          </span>
          {!timerIdle && (
            <span className="font-mono text-[11px] text-accent tabular-nums">+{xpSoFar} XP SO FAR</span>
          )}
        </button>

        <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          {!timerIdle && <IconButton icon="stop" aria-label="Stop" onClick={() => void stop()} />}
          <PlayButton
            playing={timer.phase === 'running'}
            onClick={() => void (timerIdle ? start('focus', 25) : timer.phase === 'running' ? pause() : resume())}
            aria-label={timerIdle ? 'Start focus timer' : timer.phase === 'running' ? 'Pause' : 'Resume'}
            size="small"
          />
          {!timerIdle && <IconButton icon="plus" aria-label="Add 5 minutes" onClick={() => void addFiveMinutes()} />}
        </div>

        <MusicCardContainer />

        {nextTask && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted">Next deadline</span>
              <Countdown remainingMs={(nextTask.dueAt ?? 0) - Date.now()} size={16} />
            </div>
            <QuestRow title={nextTask.title} />
          </div>
        )}
      </div>

      <div className="px-3 pb-3 flex-none">
        <CommandBarContainer />
      </div>
    </div>
  );
}
