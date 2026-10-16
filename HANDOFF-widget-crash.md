# Handoff: Ascendant freezes/crashes + widget misbehaviour — root cause

Read this whole file before changing anything. Diagnosed against the installed
build at P:\Ascendant\ascendant.exe (built 2026-10-16 20:43 UTC, i.e. it
includes the *uncommitted* NATIVE_LOCK change in desktop_anchor.rs).

## TL;DR

Both problems come from one place: `apps/desktop/src-tauri/src/commands/desktop_anchor.rs`,
the WorkerW "sit on the desktop" reparenting. Patching it further will not
work — remove the technique and replace it with a plain top-level window
that uses Tauri's own `set_always_on_bottom`.

## What I saw on the running app

- The widget (unpinned / "sits on the desktop" mode) renders *underneath the
  desktop icons*: icon images and labels draw on top of the widget's text,
  timer and buttons. This is exactly where WorkerW lives — behind
  `SHELLDLL_DefView`/`SysListView32`, the full-screen desktop icon list.
- Because that icon list covers the whole screen *above* WorkerW, it gets
  every mouse event. The widget can't be clicked, dragged, pinned or closed
  while anchored. This isn't a hit-testing bug you can fix with styles; it's
  how that window layer works. (Wallpaper Engine/Lively use WorkerW
  precisely *because* nothing in it is meant to be interactive.)
- Launching Ascendant again while it was already running did not bring up
  the main window.

## Root cause 1: deadlock → "Not Responding" → looks like a crash

`anchor_addr()` holds `NATIVE_LOCK` while it calls `SetWindowLongPtrW(GWL_STYLE)`
and `SetWindowPos(SWP_FRAMECHANGED)` from the **watcher thread** on an HWND
owned by the **main UI thread**. Those calls are *not* marshalled; the module
doc says they are, but they're called directly from the `std::thread::spawn`
loop. Across threads, Win32 delivers WM_STYLECHANGING/WM_STYLECHANGED/
WM_NCCALCSIZE to the owner thread with a synchronous SendMessage and **waits**
for the main thread to process them.

Meanwhile the main thread also tries to take `NATIVE_LOCK`:
- in `setup()`: `apply_anchor("widget")` spawns the widget watcher, which
  immediately runs `anchor_addr`, and then the main thread calls
  `apply_anchor("strip")` → `anchor_addr` → `NATIVE_LOCK.lock()`;
- in `set_companion_anchor`, a **sync** `#[tauri::command]`. In Tauri 2,
  non-async commands run on the main thread.

The watcher holds the lock and waits for the main thread. The main thread
waits for the lock. That's a permanent hang: every window freezes, Windows
marks the app "Not Responding" and eventually offers to close it. The
window for it is wide: `find_worker_w()` does a `SendMessageTimeout` to
Explorer (up to 1 s) *while holding the lock*, every 4 s, for **each**
anchored window (widget and strip both get a watcher at startup, even the
hidden one).

The committed version (without the lock) avoids this exact deadlock, but it
still mutates the main thread's HWND from a background thread without
synchronisation, and that's racy.

## Root cause 2: the technique fights both Windows and tao

- **tao rewrites `GWL_STYLE`** on every `show`/`hide`/`set_focus`/
  `set_always_on_top`/`set_shadow` (its own comment says so). We call
  `set_focus()` in `show_default_companion_window` and `toggle_companion_size`,
  so the window flips WS_CHILD → WS_POPUP while it's still parented to
  WorkerW. That's the "visible but no input" state, and it lasts until the
  next 4 s watcher tick.
- **Cross-process parenting.** Making our HWND a child of Explorer's WorkerW
  joins our UI thread's input queue to Explorer's. An Explorer hiccup stalls
  us, and the other way round.
- **WorkerW gets destroyed** when Explorer restarts, on some display/DPI
  changes, and when live-wallpaper apps reset it (this PC has a live
  wallpaper running). Destroying a parent destroys its child windows, so
  the widget's HWND and its WebView2 die out from under Tauri. The
  widget also hosts the real `<audio>` element (see `StripContent.tsx`),
  so music dies with it. The watcher keeps calling Win32 on the stale
  `hwnd_addr` it captured at spawn time.
- `[profile.release] panic = "abort"`: any panic that follows (all the
  `unwrap()`/`expect()` in setup, timer, db) kills the process instantly
  and leaves no trace.

## Contributing issues (fix while you're there)

1. **No single-instance guard.** Autostart runs `ascendant.exe --widget` and
   the user can launch it again from the shortcut, which gives two processes.
   Both open the same SQLite file, register the same global hotkey, create two
   tray icons, run two timers and anchor two widgets. `init_db` sets no
   `busy_timeout`, so the second instance's migration step can get
   SQLITE_BUSY → `expect("failed to open/migrate the database")` → abort.
   Add `tauri-plugin-single-instance`: on the second launch, focus or show the
   existing main window and exit. Also run `PRAGMA busy_timeout = 5000` in `init_db`.
2. **No crash trail.** Add `tauri-plugin-log` (file target in the app log dir)
   and a `std::panic::set_hook` that writes the panic message and backtrace to
   that log before abort. Then the next crash shows up in a file.

## Fix plan (do in this order)

1. **Delete the WorkerW mechanism.** Remove `desktop_anchor.rs`'s `imp`
   Windows module, the watcher threads, `NATIVE_LOCK`, `AnchorWatchers`, and the
   `windows` crate dependency if nothing else uses it. Discard the uncommitted
   diff in that file.
2. **Reimplement the "pin" toggle with Tauri APIs only:**
   - pinned (`alwaysOnTop: true`): `set_always_on_bottom(false)` then
     `set_always_on_top(true)`
   - unpinned: `set_always_on_top(false)` then `set_always_on_bottom(true)`
   Keep `skipTaskbar`, transparency and the drag region as they are. Tell the
   user, in the PR or summary, that Win+D / Show Desktop will now minimise the
   widget like any other window. That's the trade-off for it being clickable.
   Keep the command name `set_companion_anchor` so the frontend doesn't
   change, or rename it and update `WidgetContent.tsx`/`StripContent.tsx`.
3. **Make that command `async`** (or run window calls through
   `app.run_on_main_thread`). Never touch an HWND from a thread you spawned.
4. **Startup:** only apply the mode to the window that's actually being
   shown. `toggle_companion_size` should apply it to the newly shown window
   as well, since `show`/`set_focus` can reset z-order flags.
5. Add the single-instance plugin, `busy_timeout`, log plugin and panic hook
   from the section above.
6. Update `docs/decisions.md`: record that WorkerW reparenting was tried and
   dropped (interactive widgets can't live behind the icon layer; it
   deadlocked and fought tao), and that it was replaced with always-on-bottom.
   Remove the long comments in `WidgetContent.tsx`/`StripContent.tsx` that
   describe the reparenting race.

## How to verify

- `pnpm lint && pnpm typecheck && pnpm test`, then `pnpm tauri build`, then
  reinstall.
- Unpinned: the widget sits *above* the desktop icons, below normal app
  windows. You can click, drag and close it, and the icons never draw over it.
- Toggle pin 20 times quickly from the widget, and from Settings → Widget. No
  freeze.
- Restart Explorer (Task Manager → Windows Explorer → Restart). Ascendant
  stays alive, the widget is still there and music keeps playing.
- Collapse to the strip and expand again, a few times. Only one is visible,
  and it's in the correct mode.
- Launch the exe a second time while it's running. The existing window comes
  forward, with no second tray icon.
- Leave it running for 30+ minutes with a focus timer and music going. No
  freeze.
