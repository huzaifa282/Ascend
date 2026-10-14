//! Ascendant desktop shell (Rust side).
//!
//! Phase 2 adds the single-connection SQLite command layer (`commands::db`).
//! Later phases add keychain, media, music_folder, voice, taskbar and
//! windows commands as the spec's platform features (section 11) come
//! online.

mod commands;

use commands::db::{db_batch_atomic, db_execute, db_select, init_db, AppDb};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![db_select, db_execute, db_batch_atomic])
        .setup(|app| {
            let conn = init_db(app.handle()).expect("failed to open/migrate the database");
            app.manage(AppDb(Mutex::new(conn)));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Ascendant application");
}
