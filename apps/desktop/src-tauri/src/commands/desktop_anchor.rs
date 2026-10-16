//! The companion widget/strip's "pin" toggle. Plain, cross-platform Tauri
//! window-level z-order control — pinned floats on top of everything;
//! unpinned sits below every other normal window instead (still above the
//! desktop itself).
//!
//! A previous version of this reparented the window behind the desktop icon
//! layer via Explorer's undocumented `WorkerW` (the Rainmeter/Wallpaper
//! Engine trick), to get a window that's visually "on the desktop" rather
//! than just non-topmost. That was removed — see docs/decisions.md — after
//! a diagnosis against the real installed build found it unfixable:
//! `WorkerW` sits *behind* the desktop icon list, so the icon layer gets
//! every mouse event first, and nothing rendered there can ever be clicked.
//! It was also the direct cause of a real cross-thread deadlock (a watcher
//! thread and the main UI thread each waiting on the other). The trade-off
//! for the widget being usable at all: Win+D/Show Desktop now minimises it
//! like any other normal window, instead of leaving it visible behind the
//! icons.

use tauri::Manager;

/// `anchor = true` sits below every other window; `false` floats on top.
/// Matches the frontend's existing `invoke('set_companion_anchor', { label, anchor })`
/// call sites exactly, so nothing there needs to change.
pub fn apply_anchor(app: &tauri::AppHandle, label: &str, anchor: bool) -> Result<(), String> {
    let window = app.get_webview_window(label).ok_or_else(|| format!("{label} window missing"))?;
    if anchor {
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
        window.set_always_on_bottom(true).map_err(|e| e.to_string())?;
    } else {
        window.set_always_on_bottom(false).map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Reads `settings.widget.alwaysOnTop` the same ad-hoc way `lib.rs`'s old
/// `default_always_on_top` did (not worth a typed Rust mirror of the JS Zod
/// schema for one field) — shared here so both `lib.rs`'s startup and
/// `commands::windows`'s show/toggle functions apply the same saved mode
/// instead of each guessing independently.
pub fn companion_always_on_top(app: &tauri::AppHandle) -> bool {
    use super::db::AppDb;
    let Some(db) = app.try_state::<AppDb>() else { return true };
    let Ok(conn) = db.0.lock() else { return true };
    let json: rusqlite::Result<String> =
        conn.query_row("SELECT widget FROM settings LIMIT 1", [], |row| row.get(0));
    json.ok()
        .and_then(|j| serde_json::from_str::<serde_json::Value>(&j).ok())
        .and_then(|v| v.get("alwaysOnTop").and_then(|b| b.as_bool()))
        .unwrap_or(true)
}

#[tauri::command]
pub fn set_companion_anchor(app: tauri::AppHandle, label: String, anchor: bool) -> Result<(), String> {
    apply_anchor(&app, &label, anchor)
}
