/**
 * Spec 5.7 / 11.2 — bridges the Rust timer state machine to React. In the
 * desktop app this listens to `timer:tick`/`timer:done` (emitted to every
 * window, so the widget and tray stay in sync without polling) and invokes
 * the `timer_*` commands. In the browser/dev:web adapter (no Rust side) it
 * falls back to a plain JS interval so the UI still works for local dev.
 *
 * `@tauri-apps/api/core` and `/event` are imported statically: they're
 * already part of the eagerly-loaded main bundle (via platform/tauri.ts),
 * so dynamically importing them here again would only add overhead, unlike
 * the genuinely-heavy sql.js browser adapter (see docs/decisions.md).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  checkPenaltyZoneRecovery,
  createServiceContext,
  startTimerSession as startTimerSessionService,
  timerCredit as timerCreditService,
} from '../services';
import { useMomentsStore } from '../stores/useMomentsStore';

export type TimerKind = 'focus' | 'break';
export type TimerPhase = 'idle' | 'running' | 'paused' | 'done' | 'stopped';

export interface TimerState {
  phase: TimerPhase;
  kind: TimerKind;
  totalS: number;
  leftS: number;
  session: number;
  of: number;
  taskRef: string | null;
}

const IDLE_STATE: TimerState = { phase: 'idle', kind: 'focus', totalS: 0, leftS: 0, session: 1, of: 4, taskRef: null };

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

interface TimerTickEvent {
  kind: TimerKind;
  left_s: number;
  total_s: number;
  session: number;
  of: number;
  task_ref: string | null;
  phase: TimerPhase;
}

interface TimerDoneEvent {
  kind: TimerKind;
  focused_s: number;
  end_reason: 'completed' | 'stopped';
  session: number;
  of: number;
  task_ref: string | null;
}

export function useTimer() {
  const [state, setState] = useState<TimerState>(IDLE_STATE);
  const jsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jsStateRef = useRef<TimerState>(IDLE_STATE);
  // The current timer_sessions row id (spec 5.7) — created at start(), then
  // matched against when the done event arrives, from either backend.
  const sessionDbIdRef = useRef<string | null>(null);

  const pushMoment = useMomentsStore((s) => s.push);

  const creditSession = useCallback(
    async (done: TimerDoneEvent) => {
      const dbId = sessionDbIdRef.current;
      sessionDbIdRef.current = null;
      if (!dbId) return;
      const ctx = await createServiceContext();
      const result = await timerCreditService(ctx, {
        timerSessionId: dbId,
        focusedMinutes: Math.round(done.focused_s / 60),
        endReason: done.end_reason,
        startedAt: Date.now() - done.focused_s * 1000,
        now: Date.now(),
      });
      if (result.levelsGained && result.levelsGained > 0 && result.newLevel) {
        pushMoment({
          kind: 'levelUp',
          fromLevel: result.newLevel - result.levelsGained,
          toLevel: result.newLevel,
          hpRestored: true,
        });
      }
      const recovery = await checkPenaltyZoneRecovery(ctx, Date.now());
      if (recovery.cleared) pushMoment({ kind: 'penaltyZoneCleared' });
    },
    [pushMoment],
  );

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenTick: (() => void) | undefined;
    let unlistenDone: (() => void) | undefined;

    (async () => {
      unlistenTick = await listen<TimerTickEvent>('timer:tick', (event) => {
        const p = event.payload;
        setState({ phase: p.phase, kind: p.kind, totalS: p.total_s, leftS: p.left_s, session: p.session, of: p.of, taskRef: p.task_ref });
      });
      unlistenDone = await listen<TimerDoneEvent>('timer:done', (event) => {
        if (event.payload.kind === 'focus') void creditSession(event.payload);
      });

      const current = await invoke<{
        phase: TimerPhase;
        kind: TimerKind;
        total_s: number;
        elapsed_s: number;
        session: number;
        of: number;
        task_ref: string | null;
      }>('timer_get_state');
      setState({
        phase: current.phase,
        kind: current.kind,
        totalS: current.total_s,
        leftS: current.total_s - current.elapsed_s,
        session: current.session,
        of: current.of,
        taskRef: current.task_ref,
      });
    })();

    return () => {
      unlistenTick?.();
      unlistenDone?.();
    };
  }, [creditSession]);

  const start = useCallback(
    async (
      kind: TimerKind,
      totalMinutes: number,
      linked: { taskId?: string | null; dailyId?: string | null; skillId?: string | null; label?: string | null } = {},
      session = 1,
      of = 4,
    ) => {
      const totalS = totalMinutes * 60;
      if (kind === 'focus') {
        const ctx = await createServiceContext();
        sessionDbIdRef.current = await startTimerSessionService(ctx, {
          kind,
          plannedMinutes: totalMinutes,
          taskId: linked.taskId,
          dailyId: linked.dailyId,
          skillId: linked.skillId,
          now: Date.now(),
        });
      }
      const taskRef = linked.label ?? linked.taskId ?? null;

      if (isTauri()) {
        await invoke('timer_start', { kind, totalS, taskRef, session, of });
      } else {
        jsStateRef.current = { phase: 'running', kind, totalS, leftS: totalS, session, of, taskRef };
        setState(jsStateRef.current);
        if (jsIntervalRef.current) clearInterval(jsIntervalRef.current);
        jsIntervalRef.current = setInterval(() => {
          const s = jsStateRef.current;
          if (s.phase !== 'running') return;
          const leftS = Math.max(0, s.leftS - 1);
          const next: TimerState = { ...s, leftS };
          jsStateRef.current = next;
          setState(next);
          if (leftS === 0) {
            if (jsIntervalRef.current) clearInterval(jsIntervalRef.current);
            if (s.kind === 'focus') {
              void creditSession({ kind: 'focus', focused_s: totalS, end_reason: 'completed', session: s.session, of: s.of, task_ref: s.taskRef });
            }
            jsStateRef.current = IDLE_STATE;
            setState(IDLE_STATE);
          }
        }, 1000);
      }
    },
    [creditSession],
  );

  const pause = useCallback(async () => {
    if (isTauri()) {
      await invoke('timer_pause');
    } else {
      jsStateRef.current = { ...jsStateRef.current, phase: 'paused' };
      setState(jsStateRef.current);
    }
  }, []);

  const resume = useCallback(async () => {
    if (isTauri()) {
      await invoke('timer_resume');
    } else {
      jsStateRef.current = { ...jsStateRef.current, phase: 'running' };
      setState(jsStateRef.current);
    }
  }, []);

  const stop = useCallback(async () => {
    if (isTauri()) {
      await invoke('timer_stop');
    } else {
      const s = jsStateRef.current;
      if (jsIntervalRef.current) clearInterval(jsIntervalRef.current);
      if ((s.phase === 'running' || s.phase === 'paused') && s.kind === 'focus') {
        const focusedS = s.totalS - s.leftS;
        void creditSession({ kind: 'focus', focused_s: focusedS, end_reason: 'stopped', session: s.session, of: s.of, task_ref: s.taskRef });
      }
      jsStateRef.current = IDLE_STATE;
      setState(IDLE_STATE);
    }
  }, [creditSession]);

  const addFiveMinutes = useCallback(async () => {
    if (isTauri()) {
      await invoke('timer_add_five_minutes');
    } else {
      jsStateRef.current = { ...jsStateRef.current, totalS: jsStateRef.current.totalS + 300, leftS: jsStateRef.current.leftS + 300 };
      setState(jsStateRef.current);
    }
  }, []);

  return { state, start, pause, resume, stop, addFiveMinutes };
}
