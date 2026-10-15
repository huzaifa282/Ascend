import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClockCard, TimerModal } from '@ascendant/ui';
import type { ClockCardState } from '@ascendant/ui';
import { useTimer } from '../hooks/useTimer';
import { useOpenTasks } from '../hooks/useTasks';

const PHASE_TO_STATE: Record<string, ClockCardState> = {
  idle: 'idle',
  running: 'running',
  paused: 'paused',
  done: 'idle',
  stopped: 'idle',
};

/** Wires ClockCard + TimerModal to the real Rust timer (spec 9.2, 11.2). */
export function ClockCardContainer() {
  const navigate = useNavigate();
  const { state, start, pause, resume, stop, addFiveMinutes } = useTimer();
  const { data: openTasks } = useOpenTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [lengthPreset, setLengthPreset] = useState<'25' | '50' | '90' | 'custom'>('25');
  const [breakPreset, setBreakPreset] = useState<'5' | '10' | '15'>('5');
  const [workingOnId, setWorkingOnId] = useState<string | null>(null);
  const [playMusicOnStart, setPlayMusicOnStart] = useState(false);
  const [soundAtEnd, setSoundAtEnd] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);

  const clockState = PHASE_TO_STATE[state.phase] ?? 'idle';
  const isBreak = state.kind === 'break';

  const handlePlayPause = () => {
    if (state.phase === 'idle') {
      const minutes = lengthPreset === 'custom' ? 25 : Number(lengthPreset);
      const task = openTasks?.find((t) => t.id === workingOnId);
      void start('focus', minutes, { taskId: workingOnId, label: task?.title ?? null });
    } else if (state.phase === 'running') {
      void pause();
    } else if (state.phase === 'paused') {
      void resume();
    }
  };

  return (
    <>
      <ClockCard
        state={isBreak ? 'break' : clockState}
        elapsedMin={(state.totalS - state.leftS) / 60}
        totalMin={state.totalS / 60 || 25}
        linkedTitle={state.taskRef ?? undefined}
        onOpen={() => setModalOpen(true)}
        onPlayPause={handlePlayPause}
      />
      <TimerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        elapsedMin={(state.totalS - state.leftS) / 60}
        totalMin={state.totalS / 60 || Number(lengthPreset === 'custom' ? 25 : lengthPreset)}
        onBreak={isBreak}
        lengthPreset={lengthPreset}
        onLengthChange={setLengthPreset}
        breakPreset={breakPreset}
        onBreakChange={setBreakPreset}
        workingOnOptions={(openTasks ?? []).map((t) => ({ id: t.id, label: t.title }))}
        workingOnId={workingOnId}
        onWorkingOnChange={setWorkingOnId}
        playMusicOnStart={playMusicOnStart}
        onPlayMusicChange={setPlayMusicOnStart}
        soundAtEnd={soundAtEnd}
        onSoundAtEndChange={setSoundAtEnd}
        autoStartBreaks={autoStartBreaks}
        onAutoStartBreaksChange={setAutoStartBreaks}
        onStop={stop}
        onPause={state.phase === 'running' ? pause : resume}
        onAddFive={addFiveMinutes}
        onFullScreen={() => {
          setModalOpen(false);
          navigate('/focus');
        }}
      />
    </>
  );
}
