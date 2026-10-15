import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dial, RoundButton, Toggle } from '@ascendant/ui';
import { useTimer } from '../hooks/useTimer';
import { useOpenTasks } from '../hooks/useTasks';

/** Focus mode — spec 10.15. Full window, no sidebar or command bar; Esc exits. */
export function Focus() {
  const navigate = useNavigate();
  const { state, start, pause, resume, stop, addFiveMinutes } = useTimer();
  const { data: openTasks } = useOpenTasks();
  const [doNotDisturb, setDoNotDisturb] = useState(true);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') navigate('/today');
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  const isBreak = state.kind === 'break';
  const linkedTask = openTasks?.find((t) => t.id === state.taskRef || t.title === state.taskRef);
  const elapsedMin = (state.totalS - state.leftS) / 60;
  const totalMin = state.totalS / 60 || 25;
  const xpSoFar = Math.round(elapsedMin * 1); // live projection; credited for real only at session end (spec 5.7).

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-between bg-bg text-text py-8">
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
          FOCUS MODE / SESSION {state.session} OF {state.of}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">ESC TO EXIT</span>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Dial size={400} elapsedMin={elapsedMin} totalMin={totalMin} onBreak={isBreak} />
        {isBreak ? (
          <p className="font-display text-[16px] text-text-muted">Stand up. Water. Look far away.</p>
        ) : (
          <>
            {linkedTask && (
              <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
                WORKING ON {linkedTask.title}
              </span>
            )}
            <span className="font-mono text-[13px] text-accent">+{xpSoFar} XP SO FAR / TRAINS FOCUS</span>
          </>
        )}
        <div className="flex items-center gap-3">
          <Button variant="default" onClick={() => void stop()}>
            {isBreak ? 'SKIP BREAK' : 'END SESSION'}
          </Button>
          <RoundButton
            icon={state.phase === 'running' ? 'pause' : 'play'}
            size={32}
            aria-label={state.phase === 'idle' ? 'Start' : state.phase === 'running' ? 'Pause' : 'Resume'}
            onClick={() =>
              void (state.phase === 'idle' ? start('focus', 25) : state.phase === 'running' ? pause() : resume())
            }
          />
          <Button variant="default" onClick={() => void addFiveMinutes()}>
            +5 MIN
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Do not disturb</span>
        <Toggle checked={doNotDisturb} onChange={setDoNotDisturb} aria-label="Do not disturb" />
      </label>
    </div>
  );
}
