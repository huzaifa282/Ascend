//! Ascendant desktop shell (Rust side).
//!
//! Phase 0 scaffold: window-state persistence only. Later phases add the
//! `commands` modules below (keychain, media, music_folder, taskbar, windows,
//! timer, jobs) as the spec's platform features (section 11) come online.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running the Ascendant application");
}
