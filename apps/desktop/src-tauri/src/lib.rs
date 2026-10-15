//! Ascendant desktop shell (Rust side).
//!
//! Phase 2 adds the single-connection SQLite command layer (`commands::db`).
//! Phase 4 adds the OS keychain commands (`commands::keychain`, spec 12.1)
//! and `tauri-plugin-http` (spec 2: avoids CORS for provider calls). Phase 5
//! adds the focus timer state machine (`timer`, spec 11.2). Later phases add
//! media, music_folder, voice, taskbar and windows commands as the spec's
//! platform features (section 11) come online.

mod commands;
mod timer;

use commands::db::{db_batch_atomic, db_execute, db_select, init_db, AppDb};
use commands::keychain::{keychain_delete, keychain_get, keychain_has, keychain_set};
use std::sync::Mutex;
use tauri::Manager;
use timer::{
    spawn_tick_loop, timer_add_five_minutes, timer_get_state, timer_pause, timer_resume,
    timer_start, timer_stop, TimerManager, TimerState,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            db_select,
            db_execute,
            db_batch_atomic,
            keychain_set,
            keychain_get,
            keychain_has,
            keychain_delete,
            timer_start,
            timer_pause,
            timer_resume,
            timer_stop,
            timer_add_five_minutes,
            timer_get_state,
        ])
        .setup(|app| {
            let conn = init_db(app.handle()).expect("failed to open/migrate the database");
            app.manage(AppDb(Mutex::new(conn)));
            app.manage(TimerManager(Mutex::new(TimerState::default())));
            spawn_tick_loop(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Ascendant application");
}
