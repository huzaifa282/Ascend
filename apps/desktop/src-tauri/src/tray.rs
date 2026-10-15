//! Spec 11.5 — tray icon and menu: Open, Show widget, Start focus, Quit.
//! A left click on the tray icon shows the widget (the companion's main
//! entry point when main is hidden).

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle,
};

use crate::commands::windows::{open_main_window, show_widget_window};

pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let widget_item = MenuItem::with_id(app, "show_widget", "Show widget", true, None::<&str>)?;
    let focus_item = MenuItem::with_id(app, "start_focus", "Start focus", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_item, &widget_item, &focus_item, &quit_item])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().expect("app icon configured in tauri.conf.json"))
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Ascendant")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                let _ = open_main_window(app, Some("/today".to_string()));
            }
            "show_widget" => {
                let _ = show_widget_window(app);
            }
            "start_focus" => {
                let _ = open_main_window(app, Some("/focus".to_string()));
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                let _ = show_widget_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
