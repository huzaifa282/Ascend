//! A true "sits on the desktop" mode for the companion widget/strip (explicit
//! product decision, see docs/decisions.md): the window renders *behind* every
//! other application window, the way an old Windows desktop gadget or a
//! Rainmeter skin does, rather than just being a normal non-topmost window —
//! that weaker behaviour is what `Window::set_always_on_bottom` would give for
//! free, and it isn't what was asked for (it's still a regular top-level
//! window: Show Desktop would minimise it, and it can still end up stacked
//! above other windows depending on focus order).
//!
//! This relies on the same undocumented `WorkerW` technique those tools use:
//! ask Explorer's `Progman` window to spawn a hidden `WorkerW` behind the
//! desktop icons (message `0x052C`), then `SetParent` our window under it.
//! It is unsupported by Microsoft, Windows-only, and known to be undone by an
//! Explorer restart or some display/DPI changes — `set_companion_anchor`
//! starts a background watcher that keeps re-attaching every few seconds
//! while anchoring is on, and stops it the moment it's turned off.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::Manager;

/// Per-window "keep re-attaching" flags, one per currently-anchored window
/// label. Stopping the flag before starting a new one (or detaching) means
/// toggling back and forth never leaves a stale watcher thread running.
#[derive(Default)]
pub struct AnchorWatchers(pub Mutex<HashMap<String, Arc<AtomicBool>>>);

fn stop_watcher(watchers: &AnchorWatchers, label: &str) {
    if let Ok(mut map) = watchers.0.lock() {
        if let Some(flag) = map.remove(label) {
            flag.store(false, Ordering::Relaxed);
        }
    }
}

#[cfg(target_os = "windows")]
mod imp {
    use super::*;
    use std::time::Duration;
    use windows::core::{w, PCWSTR};
    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, FindWindowExW, FindWindowW, GetWindowLongPtrW, SendMessageTimeoutW, SetParent,
        SetWindowLongPtrW, SetWindowPos, GWL_STYLE, SMTO_NORMAL, SWP_FRAMECHANGED, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_CHILD, WS_POPUP,
    };

    struct FindState {
        worker_w: HWND,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> windows::core::BOOL {
        let state = unsafe { &mut *(lparam.0 as *mut FindState) };
        // The desktop icons live in a SHELLDLL_DefView child of one top-level
        // window; the WorkerW immediately *after* that one in z-order is the
        // empty one Explorer creates behind the icons — that's the one we want.
        let has_defview = unsafe { FindWindowExW(Some(hwnd), None, w!("SHELLDLL_DefView"), PCWSTR::null()) };
        if has_defview.is_ok() {
            if let Ok(next) = unsafe { FindWindowExW(None, Some(hwnd), w!("WorkerW"), PCWSTR::null()) } {
                state.worker_w = next;
            }
        }
        true.into()
    }

    fn find_worker_w() -> Option<HWND> {
        let progman = unsafe { FindWindowW(w!("Progman"), PCWSTR::null()) }.ok()?;

        // Ask Progman to create the hidden WorkerW if it hasn't already.
        // Undocumented, but this exact message is what every known
        // implementation of this trick sends; the timeout keeps a hung
        // Explorer from blocking us.
        let mut result: usize = 0;
        unsafe {
            let _ = SendMessageTimeoutW(progman, 0x052C, WPARAM(0), LPARAM(0), SMTO_NORMAL, 1000, Some(&mut result));
        }

        let mut state = FindState { worker_w: HWND(std::ptr::null_mut()) };
        unsafe {
            let _ = EnumWindows(Some(enum_proc), LPARAM(&mut state as *mut FindState as isize));
        }

        (!state.worker_w.0.is_null()).then_some(state.worker_w)
    }

    /// `SetParent` alone does not make Windows treat the window as a real
    /// child for input/hit-testing — a window tao creates undecorated is
    /// `WS_POPUP`, and reparenting a `WS_POPUP` window without also flipping
    /// it to `WS_CHILD` is exactly what leaves it visible but unable to
    /// receive clicks. `SWP_FRAMECHANGED` forces Windows to re-evaluate the
    /// style change (per `SetWindowLongPtr`'s own documented requirement).
    fn set_child_style(hwnd: HWND, is_child: bool) {
        unsafe {
            let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            let new_style = if is_child {
                (style & !(WS_POPUP.0 as isize)) | (WS_CHILD.0 as isize)
            } else {
                (style & !(WS_CHILD.0 as isize)) | (WS_POPUP.0 as isize)
            };
            SetWindowLongPtrW(hwnd, GWL_STYLE, new_style);
            let _ = SetWindowPos(
                hwnd,
                None,
                0,
                0,
                0,
                0,
                SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            );
        }
    }

    fn anchor_addr(hwnd_addr: isize) -> bool {
        let hwnd = HWND(hwnd_addr as *mut _);
        match find_worker_w() {
            Some(worker) => {
                set_child_style(hwnd, true);
                let attached = unsafe { SetParent(hwnd, Some(worker)) }.is_ok();
                // Re-assert after SetParent too: some Windows builds reset
                // non-client metrics on reparent, so one FRAMECHANGED before
                // and after is cheap insurance against the style not sticking.
                let _ = unsafe {
                    SetWindowPos(hwnd, None, 0, 0, 0, 0, SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE)
                };
                attached
            }
            None => false,
        }
    }

    fn detach_addr(hwnd_addr: isize) {
        let hwnd = HWND(hwnd_addr as *mut _);
        let _ = unsafe { SetParent(hwnd, None) };
        set_child_style(hwnd, false);
    }

    pub fn apply(app: &tauri::AppHandle, watchers: &AnchorWatchers, label: &str, anchor: bool) -> Result<(), String> {
        let window = app.get_webview_window(label).ok_or_else(|| format!("{label} window missing"))?;
        stop_watcher(watchers, label);

        let hwnd_addr = window.hwnd().map_err(|e| e.to_string())?.0 as isize;

        if anchor {
            window.set_always_on_top(false).map_err(|e| e.to_string())?;
            anchor_addr(hwnd_addr);

            let flag = Arc::new(AtomicBool::new(true));
            watchers
                .0
                .lock()
                .map_err(|e| e.to_string())?
                .insert(label.to_string(), flag.clone());

            // Explorer restarting (or some display/DPI changes) destroys and
            // recreates the WorkerW, silently detaching whatever was parented
            // to it — keep checking every few seconds while this is turned on.
            std::thread::spawn(move || {
                while flag.load(Ordering::Relaxed) {
                    anchor_addr(hwnd_addr);
                    for _ in 0..40 {
                        if !flag.load(Ordering::Relaxed) {
                            return;
                        }
                        std::thread::sleep(Duration::from_millis(100));
                    }
                }
            });
        } else {
            detach_addr(hwnd_addr);
            window.set_always_on_top(true).map_err(|e| e.to_string())?;
        }

        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
mod imp {
    use super::*;

    /// The WorkerW trick is Windows-only; elsewhere "not pinned" just falls
    /// back to a normal, non-topmost window.
    pub fn apply(app: &tauri::AppHandle, watchers: &AnchorWatchers, label: &str, anchor: bool) -> Result<(), String> {
        stop_watcher(watchers, label);
        let window = app.get_webview_window(label).ok_or_else(|| format!("{label} window missing"))?;
        window.set_always_on_top(!anchor).map_err(|e| e.to_string())
    }
}

/// Turns the "sits on the desktop" mode on or off for one companion window
/// (spec decision: default is anchored; the user can opt back into floating
/// on top of everything via Settings > Widget's "Always on top"). Plain
/// function so both the IPC command below and `lib.rs`'s startup setup (which
/// has no `tauri::State` to extract from) can call the same logic.
pub fn apply_anchor(app: &tauri::AppHandle, watchers: &AnchorWatchers, label: &str, anchor: bool) -> Result<(), String> {
    imp::apply(app, watchers, label, anchor)
}

#[tauri::command]
pub fn set_companion_anchor(
    app: tauri::AppHandle,
    watchers: tauri::State<AnchorWatchers>,
    label: String,
    anchor: bool,
) -> Result<(), String> {
    apply_anchor(&app, &watchers, &label, anchor)
}
