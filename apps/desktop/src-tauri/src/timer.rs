//! Spec 11.2 — the focus timer state machine: `idle -> running -> paused ->
//! running -> done | stopped`, then `break_running -> idle`. Lives in Rust
//! (not any one window) so it survives the main window closing; ticks at
//! 1 Hz and emits `timer:tick` to every window, so the widget and tray stay
//! in sync without polling. The JS side owns crediting the finished session
//! to the database (via `timerCredit`, spec 5.7) — Rust only tracks time and
//! tells the frontend when a session needs crediting.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimerKind {
    Focus,
    Break,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimerPhase {
    Idle,
    Running,
    Paused,
    Done,
    Stopped,
}

/// A pause longer than this many minutes ends the session outright (spec 11.2 / 5.7).
const PAUSE_TIMEOUT_S: u64 = 10 * 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerState {
    pub phase: TimerPhase,
    pub kind: TimerKind,
    pub total_s: u32,
    pub elapsed_s: u32,
    /// Seconds the current pause has lasted; `None` while not paused.
    pub paused_s: Option<u32>,
    pub session: u32,
    pub of: u32,
    pub task_ref: Option<String>,
}

impl Default for TimerState {
    fn default() -> Self {
        TimerState {
            phase: TimerPhase::Idle,
            kind: TimerKind::Focus,
            total_s: 0,
            elapsed_s: 0,
            paused_s: None,
            session: 1,
            of: 4,
            task_ref: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TimerTickEvent {
    pub kind: TimerKind,
    pub left_s: u32,
    pub total_s: u32,
    pub session: u32,
    pub of: u32,
    pub task_ref: Option<String>,
    pub phase: TimerPhase,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimerDoneEvent {
    pub kind: TimerKind,
    /// Focused seconds, pauses excluded — what the frontend credits (spec 5.7).
    pub focused_s: u32,
    pub end_reason: &'static str, // "completed" | "stopped"
    pub session: u32,
    pub of: u32,
    pub task_ref: Option<String>,
}

pub struct TimerManager(pub Mutex<TimerState>);

fn emit_tick(app: &AppHandle, state: &TimerState) {
    let left_s = state.total_s.saturating_sub(state.elapsed_s);
    let _ = app.emit(
        "timer:tick",
        TimerTickEvent {
            kind: state.kind,
            left_s,
            total_s: state.total_s,
            session: state.session,
            of: state.of,
            task_ref: state.task_ref.clone(),
            phase: state.phase,
        },
    );
}

fn emit_done(app: &AppHandle, state: &TimerState, end_reason: &'static str) {
    let _ = app.emit(
        "timer:done",
        TimerDoneEvent {
            kind: state.kind,
            focused_s: state.elapsed_s,
            end_reason,
            session: state.session,
            of: state.of,
            task_ref: state.task_ref.clone(),
        },
    );
}

/// Starts a session. `session`/`of` are tracked by the frontend (which
/// knows the cycle position across focus/break pairs, spec 5.7: "Sessions
/// per cycle: 4") and simply passed through here for the tick/done events.
#[tauri::command]
pub fn timer_start(
    app: AppHandle,
    manager: tauri::State<TimerManager>,
    kind: TimerKind,
    total_s: u32,
    task_ref: Option<String>,
    session: u32,
    of: u32,
) -> TimerState {
    let mut state = manager.0.lock().unwrap();
    *state = TimerState {
        phase: TimerPhase::Running,
        kind,
        total_s,
        elapsed_s: 0,
        paused_s: None,
        session,
        of,
        task_ref,
    };
    let snapshot = state.clone();
    drop(state);
    emit_tick(&app, &snapshot);
    snapshot
}

#[tauri::command]
pub fn timer_pause(app: AppHandle, manager: tauri::State<TimerManager>) -> TimerState {
    let mut state = manager.0.lock().unwrap();
    if state.phase == TimerPhase::Running {
        state.phase = TimerPhase::Paused;
        state.paused_s = Some(0);
    }
    let snapshot = state.clone();
    drop(state);
    emit_tick(&app, &snapshot);
    snapshot
}

#[tauri::command]
pub fn timer_resume(app: AppHandle, manager: tauri::State<TimerManager>) -> TimerState {
    let mut state = manager.0.lock().unwrap();
    if state.phase == TimerPhase::Paused {
        state.phase = TimerPhase::Running;
        state.paused_s = None;
    }
    let snapshot = state.clone();
    drop(state);
    emit_tick(&app, &snapshot);
    snapshot
}

#[tauri::command]
pub fn timer_stop(app: AppHandle, manager: tauri::State<TimerManager>) -> TimerState {
    let mut state = manager.0.lock().unwrap();
    let was_active = state.phase == TimerPhase::Running || state.phase == TimerPhase::Paused;
    if was_active {
        let mut done_snapshot = state.clone();
        done_snapshot.phase = TimerPhase::Stopped;
        drop(state);
        emit_done(&app, &done_snapshot, "stopped");
        state = manager.0.lock().unwrap();
    }
    *state = TimerState::default();
    let idle_snapshot = state.clone();
    drop(state);
    emit_tick(&app, &idle_snapshot);
    idle_snapshot
}

#[tauri::command]
pub fn timer_add_five_minutes(app: AppHandle, manager: tauri::State<TimerManager>) -> TimerState {
    let mut state = manager.0.lock().unwrap();
    state.total_s += 5 * 60;
    let snapshot = state.clone();
    drop(state);
    emit_tick(&app, &snapshot);
    snapshot
}

#[tauri::command]
pub fn timer_get_state(manager: tauri::State<TimerManager>) -> TimerState {
    manager.0.lock().unwrap().clone()
}

/// Starts the 1Hz background tick loop. Call once from `setup()`.
pub fn spawn_tick_loop(app: AppHandle) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(1));
        let manager = app.state::<TimerManager>();
        let mut state = manager.0.lock().unwrap();

        match state.phase {
            TimerPhase::Running => {
                state.elapsed_s += 1;
                if state.elapsed_s >= state.total_s {
                    state.phase = TimerPhase::Done;
                    let snapshot = state.clone();
                    drop(state);
                    emit_done(&app, &snapshot, "completed");
                    let mut state = manager.0.lock().unwrap();
                    state.phase = TimerPhase::Idle;
                    let idle_snapshot = state.clone();
                    drop(state);
                    emit_tick(&app, &idle_snapshot);
                } else {
                    let snapshot = state.clone();
                    drop(state);
                    emit_tick(&app, &snapshot);
                }
            }
            TimerPhase::Paused => {
                let paused = state.paused_s.unwrap_or(0) + 1;
                state.paused_s = Some(paused);
                if paused as u64 >= PAUSE_TIMEOUT_S {
                    // Spec: "A pause longer than 10 minutes ends the session
                    // (credit what was done) and offers to start a new one."
                    state.phase = TimerPhase::Stopped;
                    let snapshot = state.clone();
                    drop(state);
                    emit_done(&app, &snapshot, "stopped");
                    let mut state = manager.0.lock().unwrap();
                    *state = TimerState::default();
                    let idle_snapshot = state.clone();
                    drop(state);
                    emit_tick(&app, &idle_snapshot);
                } else {
                    drop(state);
                }
            }
            _ => drop(state),
        }
    });
}
