//! Spec 11.3 — the global hotkey (default Ctrl+Shift+Space) that opens the
//! floating command window. Registration failure (another app already
//! owns the combo) is surfaced as a system notification rather than
//! silently doing nothing, since there's no always-visible UI to show an
//! inline error in.

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_notification::NotificationExt;

use crate::commands::windows::show_command_window;

pub const DEFAULT_HOTKEY: &str = "CommandOrControl+Shift+Space";

fn register(app: &AppHandle, combo: &str) -> bool {
    let app_handle = app.clone();
    let registered = app.global_shortcut().on_shortcut(combo, move |_app, _shortcut, event| {
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
    registered.is_ok()
}

pub fn register_hotkey(app: &AppHandle, combo: &str) {
    register(app, combo);
}

/// Spec 10.16's Hotkey settings panel: unregister everything, then try the
/// new combo. Returns whether registration succeeded.
#[tauri::command]
pub fn set_hotkey(app: AppHandle, combo: String) -> Result<bool, String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;
    Ok(register(&app, &combo))
}
