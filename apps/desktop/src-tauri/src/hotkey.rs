//! Spec 11.3 — the global hotkey (Ctrl+Shift+Space) that opens the
//! floating command window. Registration failure (another app already
//! owns the combo) is surfaced as a system notification rather than
//! silently doing nothing, since there's no always-visible UI to show an
//! inline error in.

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_notification::NotificationExt;

use crate::commands::windows::show_command_window;

const HOTKEY: &str = "ctrl+shift+space";

pub fn register_hotkey(app: &AppHandle) {
    let app_handle = app.clone();
    let registered = app.global_shortcut().on_shortcut(HOTKEY, move |_app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let _ = show_command_window(&app_handle);
        }
    });

    if registered.is_err() {
        let _ = app
            .notification()
            .builder()
            .title("Ascendant")
            .body("Shortcut in use by another app")
            .show();
    }
}
