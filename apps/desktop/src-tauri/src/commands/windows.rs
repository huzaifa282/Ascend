//! Spec 7.1 / 11.5 — window lifecycle for the main app, the companion
//! widget, the compact strip and the floating hotkey command window. The
//! widget and strip swap at the same top-left corner on collapse/expand;
//! closing `main` just hides it to the tray (`lib.rs`'s `on_window_event`)
//! so the companion keeps running.

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Serialize)]
struct NavigatePayload {
    route: String,
}

pub fn open_main_window(app: &AppHandle, route: Option<String>) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("main window missing")?;
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    if let Some(route) = route {
        app.emit_to("main", "navigate", NavigatePayload { route })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn show_widget_window(app: &AppHandle) -> Result<(), String> {
    let widget = app.get_webview_window("widget").ok_or("widget window missing")?;
    widget.show().map_err(|e| e.to_string())?;
    widget.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn show_strip_window(app: &AppHandle) -> Result<(), String> {
    let strip = app.get_webview_window("strip").ok_or("strip window missing")?;
    strip.show().map_err(|e| e.to_string())?;
    strip.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

/// Shows whichever of widget/strip the user's `defaultSize` setting picks
/// (spec 11.5's "Widget settings: ... default size").
pub fn show_default_companion_window(app: &AppHandle, compact: bool) -> Result<(), String> {
    if compact {
        show_strip_window(app)
    } else {
        show_widget_window(app)
    }
}

pub fn show_command_window(app: &AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("command").ok_or("command window missing")?;
    window.center().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_main(app: AppHandle, route: Option<String>) -> Result<(), String> {
    open_main_window(&app, route)
}

#[tauri::command]
pub fn show_widget(app: AppHandle) -> Result<(), String> {
    show_widget_window(&app)
}

/// Collapses the widget to the strip, or expands the strip back to the
/// widget, at the same top-left corner (spec 11.5).
#[tauri::command]
pub fn toggle_companion_size(app: AppHandle) -> Result<(), String> {
    let widget = app.get_webview_window("widget").ok_or("widget window missing")?;
    let strip = app.get_webview_window("strip").ok_or("strip window missing")?;

    if widget.is_visible().map_err(|e| e.to_string())? {
        let pos = widget.outer_position().map_err(|e| e.to_string())?;
        strip.set_position(pos).map_err(|e| e.to_string())?;
        widget.hide().map_err(|e| e.to_string())?;
        strip.show().map_err(|e| e.to_string())?;
        strip.set_focus().map_err(|e| e.to_string())?;
    } else {
        let pos = strip.outer_position().map_err(|e| e.to_string())?;
        widget.set_position(pos).map_err(|e| e.to_string())?;
        strip.hide().map_err(|e| e.to_string())?;
        widget.show().map_err(|e| e.to_string())?;
        widget.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn is_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}
