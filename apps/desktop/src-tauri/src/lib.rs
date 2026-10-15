//! Ascendant desktop shell (Rust side).
//!
//! Phase 2 adds the single-connection SQLite command layer (`commands::db`).
//! Phase 4 adds the OS keychain commands (`commands::keychain`, spec 12.1)
//! and `tauri-plugin-http` (spec 2: avoids CORS for provider calls). Phase 5
//! adds the focus timer state machine (`timer`, spec 11.2), the music
//! folder scanner (`commands::music_folder`, spec 11.1), and the dialog/fs
//! plugins (folder picking + serving audio files to the built-in player via
//! the asset protocol). Phase 6 adds the companion widget/strip/command
//! windows (`commands::windows`, `tray`, `hotkey`, spec 7.1/11.3/11.5).

mod commands;
mod hotkey;
mod timer;
mod tray;

use commands::db::{db_batch_atomic, db_execute, db_select, init_db, AppDb};
use commands::desktop_anchor::{apply_anchor, set_companion_anchor, AnchorWatchers};
use commands::keychain::{keychain_delete, keychain_get, keychain_has, keychain_set};
use commands::music_folder::scan_music_folder;
use commands::windows::{
    is_autostart_enabled, open_main, open_main_window, set_autostart, show_default_companion_window,
    show_widget, toggle_companion_size,
};
use hotkey::{set_hotkey, DEFAULT_HOTKEY};
use std::sync::Mutex;
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use timer::{
    spawn_tick_loop, timer_add_five_minutes, timer_get_state, timer_pause, timer_resume,
    timer_start, timer_stop, TimerManager, TimerState,
};

/// `--widget` (passed by autostart) launches straight into the companion
/// widget, leaving `main` hidden until the user opens it (spec 7.1).
fn launched_widget_only() -> bool {
    std::env::args().any(|arg| arg == "--widget")
}

/// Reads `settings.widget.defaultSize` directly (ad-hoc, not through the
/// typed Zod schema that only exists on the JS side) to decide whether to
/// show the widget or the strip at startup (spec 11.5).
fn default_companion_is_compact(conn: &rusqlite::Connection) -> bool {
    let json: rusqlite::Result<String> =
        conn.query_row("SELECT widget FROM settings LIMIT 1", [], |row| row.get(0));
    json.ok()
        .and_then(|j| serde_json::from_str::<serde_json::Value>(&j).ok())
        .and_then(|v| v.get("defaultSize").and_then(|s| s.as_str().map(|s| s == "compact")))
        .unwrap_or(false)
}

/// Reads `settings.widget.alwaysOnTop` the same ad-hoc way, so the companion
/// window starts in the right mode immediately rather than floating on top
/// for a moment before the frontend's own effect corrects it. Default is
/// `false` (anchored to the desktop) — see `commands::desktop_anchor`.
fn default_always_on_top(conn: &rusqlite::Connection) -> bool {
    let json: rusqlite::Result<String> =
        conn.query_row("SELECT widget FROM settings LIMIT 1", [], |row| row.get(0));
    json.ok()
        .and_then(|j| serde_json::from_str::<serde_json::Value>(&j).ok())
        .and_then(|v| v.get("alwaysOnTop").and_then(|b| b.as_bool()))
        .unwrap_or(false)
}

/// Reads `settings.hotkey.combo` the same ad-hoc way — falls back to the
/// default when there's no settings row yet (before onboarding) or the
/// column is missing it.
fn saved_hotkey_combo(conn: &rusqlite::Connection) -> String {
    let json: rusqlite::Result<String> =
        conn.query_row("SELECT hotkey FROM settings LIMIT 1", [], |row| row.get(0));
    json.ok()
        .and_then(|j| serde_json::from_str::<serde_json::Value>(&j).ok())
        .and_then(|v| v.get("combo").and_then(|c| c.as_str().map(str::to_string)))
        .unwrap_or_else(|| DEFAULT_HOTKEY.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_window_state::Builder::default()
                // `command` is a transient, hotkey-triggered popup — it has no
                // position/size worth remembering (it re-centres itself every
                // time it's shown) and must never auto-restore a stale
                // "visible" flag from a previous run, which is exactly what
                // caused it to reappear, undismissable, on every launch.
                .skip_initial_state("command")
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--widget"]),
        ))
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
            scan_music_folder,
            open_main,
            show_widget,
            toggle_companion_size,
            set_autostart,
            is_autostart_enabled,
            set_hotkey,
            set_companion_anchor,
        ])
        .on_window_event(|window, event| {
            // Spec 7.1: closing main hides it to the tray; the companion
            // widget/strip and the Rust timer keep running regardless.
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            let conn = init_db(app.handle()).expect("failed to open/migrate the database");
            let compact = default_companion_is_compact(&conn);
            let always_on_top = default_always_on_top(&conn);
            let hotkey_combo = saved_hotkey_combo(&conn);
            app.manage(AppDb(Mutex::new(conn)));
            app.manage(TimerManager(Mutex::new(TimerState::default())));
            app.manage(AnchorWatchers::default());
            spawn_tick_loop(app.handle().clone());

            tray::build_tray(app.handle())?;
            hotkey::register_hotkey(app.handle(), &hotkey_combo);

            // Belt-and-suspenders alongside `skip_initial_state("command")`
            // above: `command` always starts hidden, full stop.
            if let Some(command) = app.get_webview_window("command") {
                let _ = command.hide();
            }

            if launched_widget_only() {
                if let Some(main) = app.get_webview_window("main") {
                    let _ = main.hide();
                }
            } else {
                let _ = open_main_window(app.handle(), None);
            }
            let _ = show_default_companion_window(app.handle(), compact);

            // Apply the saved "always on top" / "sits on the desktop" mode to
            // both companion windows up front, so whichever one is shown
            // (compact above picked one) is never, even briefly, in the
            // wrong mode before the frontend's own effect would otherwise
            // correct it.
            {
                let watchers = app.state::<AnchorWatchers>();
                let _ = apply_anchor(app.handle(), &watchers, "widget", !always_on_top);
                let _ = apply_anchor(app.handle(), &watchers, "strip", !always_on_top);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Ascendant application");
}
