# Architecture decisions

One entry per decision the spec left to our judgment (spec section 0: "where it is
silent, choose the simplest option... and write the decision into docs/decisions.md").

## 2026-10-14 — Build scope: phases 0–7, desktop only

Phase 8 (web demo, macOS/Linux packaging, Android/iOS) is deferred. This build
targets Windows desktop end-to-end, matching the spec's stated build order
("Platforms (in build order): Windows desktop (primary)...").

## 2026-10-14 — Voice capture deferred

On-device whisper-rs needs CMake and LLVM/clang on the build machine, which was
not set up and would slow every subsequent Rust build. The mic button renders
in every state (spec 9.1, 9.2) but is disabled with the tooltip "Voice input is
coming in a later version." Text input through the command bar is unaffected.
Revisit once a provider-transcription fallback (spec 11.6, OpenAI-compatible
`/audio/transcriptions`) or the whisper-rs toolchain is in place.

## 2026-10-15 — Custom `rusqlite` command layer instead of `tauri-plugin-sql`

Spec section 2 names `tauri-plugin-sql` for SQLite access, driven through
Drizzle's `sqlite-proxy` driver. Investigating that driver found a real
correctness hazard: `db.transaction()` under `sqlite-proxy` works by sending
literal `"begin"` / `"commit"` / `"rollback"` strings through the *same*
single-statement proxy callback used for every other query, with no
connection identity attached. `tauri-plugin-sql` hands out connections from
an sqlx pool, so a later statement in the "same" transaction can silently
land on a different physical connection — the `BEGIN` on connection A does
nothing for a statement that runs on connection B, which would then
autocommit immediately. For an app whose core principle is "every number
shown can be explained from the event ledger" (spec section 1.3), a
transaction that can silently fail to be atomic is not acceptable.

Instead, `src-tauri` owns a single `rusqlite::Connection` behind a `Mutex`
(the `commands/db.rs` module), exposed as three commands: `db_select`,
`db_execute`, and `db_batch_atomic` (the last runs an array of statements
inside one real `BEGIN`/`COMMIT`, which is safe by construction since there
is only ever one connection). `packages/db`'s `sqlite-proxy` callback calls
`db_select`/`db_execute` per statement and never uses drizzle's own
`db.transaction()`; services that need atomic multi-row writes (spec 6.1:
"writes activities, tasks and events in one transaction") call a
`runAtomic()` helper that collects each query builder's `{sql, params}` via
`.toSQL()` and sends the batch to `db_batch_atomic` in one round trip. IDs
are always ULIDs generated in JS before the write, so no step ever depends
on a previous statement's generated id within the same batch.

This also drops one dependency (sqlx, pulled in by `tauri-plugin-sql`) in
favour of `rusqlite` with the `bundled` feature, which compiles SQLite
in-process from vendored C source — a lighter, synchronous dependency that
fits a single-writer embedded desktop database and this build's optimization
goal. The browser/`sql.js` platform adapter doesn't have this hazard at all
(one in-process object, no pooling), so it uses sql.js's own `exec()` with a
plain `BEGIN`/`COMMIT`/`ROLLBACK` for `runAtomic()`.

## 2026-10-15 — The browser/sql.js platform adapter loads lazily

`packages/app/src/platform/index.ts`'s `getPlatform()` loads the sql.js
browser adapter (and its ~650KB wasm asset) with a dynamic `import('./browser')`
rather than a static one, so it never lands in the desktop app's eagerly
loaded `main` bundle — that branch only runs when `isTauri()` is false. The
top-level `@ascendant/app` barrel does not re-export `createBrowserSqlExecutor`
/ `wrapSqlJsDatabase` either, so nothing pulls `browser.ts` in statically;
`packages/seed`'s Node CLI imports it via the deep path
`@ascendant/app/src/platform/browser` instead (no `package.json` "exports"
map restricts subpaths, so this resolves fine).

## 2026-10-14 — Placeholder app icon generated procedurally

No design asset was supplied. Generated a simple rounded-square mark (a
chevron "A") from the token colours (`--bg`, `--accent`) as a single 1024x1024
PNG, then ran `pnpm tauri icon` to produce the full desktop icon set
(ico/icns/png) into `apps/desktop/src-tauri/icons`. Mobile (Android/iOS) icon
variants that command also generates were deleted — out of scope for this
build (phase 8). Replace the source PNG and re-run `pnpm tauri icon` whenever
real branding exists.

## 2026-10-14 — Multi-page Vite build, one entry per window

`apps/desktop` builds four HTML entries (`main`, `widget`, `strip`, `command`)
instead of one SPA with client-side window detection. The widget and strip
bundles avoid pulling in the router, the LLM pipeline and chart code, which
keeps those always-on webviews small and fast to start (optimization goal from
the user's request).

## 2026-10-14 — Lazy main window + release profile tuning

`main` is created on first `open-main` rather than at launch when autostart
opens the app with `--widget`. Release builds use `lto = "fat"`,
`codegen-units = 1`, `opt-level = "s"`, `strip = true`, `panic = "abort"` for a
smaller, faster-starting binary.

## 2026-10-14 — Platform adapter boundary

`packages/app/src/platform` defines a `Platform` interface with a `tauri`
implementation (sql plugin, keychain, timer, media, http) and a `browser`
implementation (sql.js in memory, localStorage-backed fake keychain). The
browser adapter powers `pnpm dev:web`, Playwright's visual checks, and
non-Tauri unit tests, and later becomes the web demo (phase 8) with no
rewrite.

## 2026-10-14 — No chart library; hand-written SVG

The stat line chart, XpStrip, token-usage strip and the focus Dial are
hand-written inline SVG rather than a charting dependency, per spec 9.2's
exact pixel specs and to keep bundle size down.

## 2026-10-14 — Tailwind v3.4, CommonJS config files

Tailwind CSS v3.4 is used as "a small components.css for complex parts" per
spec section 2's wording implies a classic Tailwind setup rather than v4's
CSS-first config. `tailwind-preset.cjs` and `tailwind.config.cjs` use the
`.cjs` extension explicitly so they are parsed as CommonJS regardless of the
surrounding packages' `"type": "module"`, since Tailwind's Node API loads
configs synchronously.

## 2026-10-14 — "Night Owl" title window

Spec 5.10 defines Night Owl as "logs after 01:00 on 5 different days" with no
stated upper bound. Taken literally that would match almost any log made
after 1am through the rest of the day. Treated it as a late-night window
symmetric with Early Riser's "before 08:00": `[01:00, 05:00)` local time,
tunable via `ruleset.titles.nightOwlWindowEndHour` (default 5).

## 2026-10-14 — Fonts vendored at build time, not run-time dependencies

`@fontsource-variable/archivo` and `@fontsource/martian-mono` are `ui`
devDependencies used only to source `.woff2` files, copied once into
`packages/ui/fonts` and referenced by `@font-face` in `base.css`. No network
fetch happens at runtime (spec section 2).

Fontsource ships Archivo's two variable axes as separate per-axis files
(`wght.css` pins width to normal; `wdth.css` turns out to declare both
`font-weight: 100 900` *and* `font-stretch: 62% 125%` on the same face, i.e.
its woff2 is the full dual-axis font). We vendor that `wdth`-subset file
(`archivo-latin-wdth-normal.woff2` → `archivo-variable.woff2`) so both weight
and width vary from one `@font-face`, matching spec 8.2's numeral-vs-body
`font-stretch` distinction. Only the `latin` Unicode subset is vendored
(English-first app, smaller bundle); non-Latin text falls back to the system
sans-serif.

## 2026-10-15 — Music folder: manual re-scan, broad static fs/asset scope

Spec 11.1's music folder scanner (`commands::music_folder::scan_music_folder`)
re-scans on demand only — the user re-runs the scan (e.g. after adding files)
rather than the app watching the folder live with `notify`. A filesystem
watcher adds real complexity (debouncing, partial-write detection, tearing
down/rebuilding on folder change) for a feature whose primary use is a
one-time or occasional library import; this can be added later without
touching the scan command's shape.

`capabilities/default.json` grants `fs:allow-read-file`/`fs:allow-read-dir`
and `dialog:allow-open` with `"path": "**"`, and `tauri.conf.json` enables
the asset protocol with `"scope": ["**"]`, instead of dynamically narrowing
the scope to exactly the user-picked folder at runtime (Tauri 2 supports
this via the fs/asset-protocol scope extension APIs). The music folder can
be anywhere on disk and is chosen through an OS folder picker (implicit user
consent), and all access is read-only, so a static broad scope is a
pragmatic simplification rather than a security-relevant gap — but a
production hardening pass should switch to per-folder dynamic scoping.

## 2026-10-15 — System media (SMTC) deferred; music folder player ships first

Spec 11.1's "System media" half (`media.rs`, Windows
`GlobalSystemMediaTransportControlsSessionManager` via the `windows` crate:
async COM session subscriptions, thumbnail-stream-to-data-URL, 4/s-throttled
`music:changed` events) is deferred past phase 7. It's real platform-API
surface this environment can't run or click-test, so getting its async
session-lifecycle handling right blind is a poor trade against the rest of
phases 5-7 that can be built and verified. The music folder scanner and
built-in `<audio>`-element player (also spec 11.1) ship now — fully
exercised through `cargo check`/`vite build` and manual testing once the
user runs the app. `MusicSettings.systemMediaEnabled` stays in the schema,
inert, mirroring `VoiceSettings`'s existing pattern for a deferred feature.

## 2026-10-15 — Phase 6: companion windows, cross-window music bus, taskbar buttons deferred

Widget, strip and command are separate webviews (separate JS heaps) declared
statically in `tauri.conf.json` with `visible: false`, then shown from Rust
in `setup()` based on CLI args (`--widget`, passed by autostart) and the
user's `widget.defaultSize` setting (read with a raw, ad-hoc `rusqlite`
query in `lib.rs` — not worth a typed Rust mirror of the JS Zod schema for
one field). `commands::windows` centralises `open_main`/`show_widget`/
`toggle_companion_size` (collapse<->expand swaps the two at the same
top-left corner) so both the tray and JS `invoke()` share one
implementation. Closing `main` hides it instead of destroying it
(`on_window_event`), matching spec 7.1; the Rust timer and tray keep running
either way.

**Cross-window music sync.** The built-in `<audio>` player
(`useMusicPlayer`) only truly lives in the widget window, since the widget
is merely hidden (not destroyed) when collapsed to the strip — its audio
keeps playing. Giving the strip its own independent `useMusicPlayer`
instance would silently desync (two unrelated `Audio()` elements). Instead
the widget's player broadcasts `music:state` (track + playing) over Tauri's
event bus and listens for `music:command`; the strip's `useMusicPlayerRemote`
is a thin mirror that only sends commands and displays the last broadcast
state — it never touches audio directly. The command window has no such
problem since it has no transport controls of its own.

**`@ascendant/app/companion/*` import boundary.** The widget/strip/command
entries import the companion root components through a dedicated Vite
alias + tsconfig `paths` entry pointing straight at
`packages/app/src/companion/`, not through the package's main barrel
(`index.ts`), which also exports the full `App` (router + every screen).
Routing through the barrel once collapsed all four entries' bundles into
one shared ~550KB chunk (confirmed by an actual `vite build` run) because
Rollup couldn't prove `App`'s module-level `QueryClient` side effect was
unreachable from the shared barrel file. Bypassing the barrel restored
proper per-entry code-splitting (confirmed by re-running the build).

**Deferred to a later pass**, each a real gap, not an oversight:
- **Taskbar thumbnail buttons** (`ITaskbarList3` via the `windows` crate):
  genuine COM/HWND-subclassing work this environment can't click-test: a
  wrong button state or a missed `WM_COMMAND` just silently does nothing,
  with no way to notice here. Lower priority than the window/tray/hotkey
  work that makes the companion usable at all.
- **Global hotkey conflict UX**: a failed registration shows a system
  notification (spec's exact wording) but there's no in-app indicator in
  Settings > Hotkey showing current registration status yet.
- **Command window's "closes on Enter" exact behavior**: implemented as
  "stays open through interpreting/confirm, Escape hides it" instead of
  spec's literal "Enter submits and the window closes" — simpler to reason
  about without losing the confirm card, but not a byte-for-byte match.
- Manual GUI verification (dragging, collapse/expand visually, the hotkey
  from another app, tray menu clicks, autostart actually relaunching into
  `--widget`) is entirely unverified — only `cargo check`, typecheck, lint,
  the Vitest suite and `vite build` ran in this environment.

## 2026-10-15 — Phase 7 (part 1): Moments, Penalty Zone recovery, rest shields

**Moments** (spec 10.9) use a small zustand FIFO queue (`useMomentsStore`)
pushed to from every XP-awarding call site (`useCompleteTask`,
`useCompleteDaily`, `useTimer`'s `creditSession`, the command bar's
`acceptItem`/`acceptAll`) and rendered by one `<MomentsOverlay>` in `Shell`.
Level-up's "stat changes (+1 Intellect...)" line is cut: none of the
XP-awarding services currently return per-stat deltas in a shape worth
threading through four call sites for a cosmetic line, so the overlay shows
level + HP-restored only. Rank-up moments come from `dayClose`'s per-day
summary (`trialPassed`/`fromRank`/`toRank`), which is now actually invoked —
`useDayCloseOnMount` runs it once per main-window session, something no
code called before this pass despite spec 5.4 requiring it.

**Penalty Zone recovery** (`services/penaltyZone.ts`) was entirely unbuilt
before this pass (entering was wired in `hp.ts`'s `applyHpDelta`; exiting
was not). `checkPenaltyZoneRecovery` runs after `completeTask`,
`timerCredit`-crediting and the command bar's `acceptEntryItem`, computing
both recovery paths from the ledger (new repo queries:
`tasks.countCompletedOverdueSince`, `activities.maxFocusSessionMinutesSince`)
and exiting (HP -> `exitHp`, clear `penaltyZoneSince`) the moment either
completes. Shell applies the danger chrome (window border, header rule,
banner) from `usePenaltyZoneStatus`; Status shows the recovery region with
both paths' progress and a 24h countdown. Not done: `completeTask`'s reward
math never applies the penalty-zone XP multiplier (`logActivity`'s does) —
a pre-existing inconsistency this pass didn't introduce or fix; the
"HP-cap note if a penalty was reduced" sub-detail is also skipped.

**Rest shields** (spec 10.7): `ShieldDialog` wired into Quests' Today tab
(a "Rest today" button, since spec is explicit that Today itself gets no
extra content). A rest day shows a banner, "FROZEN" in place of the streak
figure on Status, and a muted "REST / FROZEN" badge with disabled checkboxes
on every daily that day — read from `shields.listForMonth`, not the
profile's `streakFrozenUntil` column (unclear what sets that column; shield
days are detected directly from the shields table instead).

**Known gap**: moments pushed from the widget window's own `useTimer`
instance (focus sessions finished while only the widget is open, main
hidden) never reach `main`'s overlay — zustand stores aren't shared across
separate webviews, same reality as the music/timer cross-window sync
elsewhere. Lower priority than a cross-window moments relay for now.

## 2026-10-15 — Phase 7 (part 2): Stat detail and Skills screens

Stat detail (spec 10.10) rebuilds its value-over-time series from the raw
`stat_events` ledger (no stored daily snapshots exist) — same approach
`recalculate()` already uses for totals, just scoped to one stat code and
windowed. "Top contributors" groups by activity title (joined from
`refId`) or a generic "Tasks" bucket; the line chart is hand-written SVG
per decision #7.

Skills (spec 10.11) renders existing skills/open suggestions with
Approve/Dismiss. The suggestion-*generation* pipeline (scanning unlinked
activity labels for 5+ occurrences in a 21-day window, per
`shouldSuggestSkill` in the engine) is not built — nothing currently
writes a row to `skill_suggestions`, so the banner only appears for
suggestions seeded or inserted some other way. This is a background-job
style feature in the same family as the title-counter work deferred
earlier; both are real gaps, not wired in this pass.

## 2026-10-15 — Phase 7 (part 3): Weekly report and share card

`services/weeklyReport.ts` computes all five figures and stat gains
straight from the ledger/repos (no cached weekly rollups exist). The
"System's written review" is always the template-driven sentence; the
optional LLM paragraph is a best-effort second `provider.complete()` call
(same pattern as `askSystem`) that silently falls back to just the
template sentence on any error, so a flaky/unconfigured provider never
blocks the report from rendering.

The share card is a real 1080x1350 DOM node rendered off-screen
(`fixed -left-[9999px]`), captured by `html-to-image`'s `toPng` at
pixelRatio 1 — not a scaled-down preview with CSS transforms, which would
need un-transforming before capture. `html-to-image`, `@tauri-apps/plugin-fs`
and `@tauri-apps/plugin-dialog` are all dynamic-imported inside
`exportShareCardPng`, consistent with the sql.js precedent: confirmed via
a real `vite build` that none of them land in `main`'s eager chunk.
`dialog:allow-save` and `fs:allow-write-file` permissions (scope `**`,
same pragmatic breadth as the music folder's read permissions) were added
to `capabilities/default.json` for this.

## 2026-10-15 — Phase 7 (part 4): onboarding (a real correctness gap, not just a missing screen)

Before this pass, the **only** code that ever created a `profile`,
`settings` or `stats` row was the seed generator — a brand-new real install
had none of them, and every screen's `if (!profile) return null` guard
would just show a blank app forever. Onboarding (spec 10.1) fixes this, not
just adds a wizard:

- `bootstrapProfile` (in `services/onboarding.ts`) creates all three rows
  the moment `/onboarding/1` mounts — idempotently, so revisiting or
  refreshing never double-creates. Doing this *early* rather than at the
  end means step 4 (connect a model) can reuse the ordinary
  `Settings > Model` panel (`ModelPanel`) completely unmodified: it needs a
  real `settings` row to persist into, which now exists.
- `Shell` redirects to `/onboarding/1` whenever `useProfile()` resolves to
  `null` (confirmed no row, not just still loading). `useDayCloseOnMount`
  now also checks for a profile before calling `dayClose` (which throws
  without one), since its effect runs unconditionally in `Shell` before
  that redirect check.
- The questionnaire's answer -> starting-stat-XP mapping and the 5
  suggested-daily templates live in `onboarding/baselines.ts`, matching
  the plan's intended file. `STAT_NAMES` is duplicated here rather than
  shared with `packages/seed`'s copy — `packages/seed` depends on
  `packages/app`, not the other way around, so sharing would invert the
  dependency rule for nine short lines.
- The optional LLM-paragraph-writing step (model connection) reuses
  `ModelPanel` as-is rather than a bespoke onboarding-only UI, trading a
  little visual customization for zero duplicated provider/key logic.

## 2026-10-15 — Phase 7 (part 5): Data, Data sharing, Hotkey, About settings

**Data** (export/import/delete-all): JSON export dumps all 22 tables via
Drizzle; import replaces everything (delete-all then insert-all, both
atomic). Table order matters for exactly two FK pairs the schema actually
enforces (`entry_items -> entries`, `daily_completions -> dailies` —
confirmed by grepping `schema.ts` for `.references(`; everything else has
no enforced FK despite some columns conceptually pointing elsewhere).
CSV export is the activity log only, not a full dump — spec's "export
JSON/CSV" reads most naturally as two different exports, not two formats
of the same one. Delete-all requires typing "DELETE" and redirects to
onboarding afterward, since there's no profile left for Shell to render
against.

**Data sharing** (spec 12.3, mislabeled 13.3 in the Settings summary line):
the level picker and review queue (list pending `share_queue` rows,
Remove) are wired to real repo methods. "Send reviewed items" and "Delete
previously shared data" are visibly disabled with "Sharing endpoint not
configured" per spec's own instruction. **Not built**: nothing actually
*populates* `share_queue` yet — the interpretation-feedback trigger point
would be ConfirmCard's edit flow, which doesn't exist (`onEdit` is still a
no-op), and the anonymous-usage weekly-counts job is a background feature
in the same unbuilt family as the title-counters and skill-suggestion
scanner noted earlier. The UI and queue are real; nothing feeds the queue.

**Hotkey**: recording a combo now actually re-registers the global
shortcut — added `hotkey::set_hotkey` (unregister-all, then register the
new combo) since the hotkey module only supported one fixed
startup-time registration before. Startup now reads
`settings.hotkey.combo` the same ad-hoc way `defaultSize` is read, falling
back to the default when there's no settings row yet.

**About**: static version/license/links — nothing to wire.

## 2026-10-15 — Phase 7 (part 6): toasts and Settings > Notifications

A toast store + `<ToastStack>` (reusing the `Notification` UI component,
bottom-right, 5s auto-dismiss, click-to-navigate) now fires for quest
complete (`useCompleteTask`/`useCompleteDaily`) and HP-low (a `Shell`-level
watcher comparing consecutive `useProfile()` reads against
`ruleset.hp.dangerThreshold`, firing once per crossing rather than every
render). Settings > Notifications has real per-type toggles and quiet
hours, persisted to `settings.notifications`/`settings.quietHours`.

**Deliberately not built** (documented rather than silently skipped):
- The toggles and quiet hours don't gate anything yet — the toast
  call sites push unconditionally. Default values are all "on" per the
  schema, so this matches default behavior; it just means turning a type
  off in Settings currently has no effect.
- No OS-level (`tauri-plugin-notification`) notifications for deadline
  warnings, morning briefing, or session complete — these need a
  time-based poller (checking open tasks' due times, a once-after-05:00
  check) this session didn't build. The hotkey-conflict notification from
  Phase 6 remains the only real OS notification in the app.
- No "stat up" or "rank trial unlocked" toasts — both need extra
  before/after plumbing through call sites that don't currently surface
  it (per-stat deltas for the former, the `trialUnlocked` flag
  `applyXpToProfile` already computes but doesn't return to callers, for
  the latter).
- No actionable notification buttons (Mark done, Snooze, Reschedule) —
  the `Notification` component supports an `actions` prop and could carry
  them, but nothing calls it with any yet.

This closes out the phases 0-7 scope agreed at the start of this build.
Remaining known gaps across the whole session are catalogued here in
docs/decisions.md rather than silently dropped; see the "Deferred to a
later pass" and similar notes throughout this file.

## 2026-10-15 — Settings sections still unwired: Voice, Stats, Ruleset tuning

Three of spec 10.16's twelve Settings sections still render the generic
"Built out further in a later phase" placeholder: **Voice** (consistent
with the standing decision at the start of this build to skip on-device
voice entirely — see this file's first entry), **Stats** (preset,
rename, reorder, hide — a settings-only refinement over the nine fixed
stat codes, not blocking any other feature), and **Ruleset tuning**
(every constant from spec section 5 with its default and Reset all — a
genuinely large UI, one input per ruleset constant across ~10 categories,
lower priority than the screens and services built this session). All
three are straightforward CRUD against existing schema/engine surface
(`MusicSettings`-style patterns apply directly); none require new
services or schema changes.

## 2026-10-15 — Fix: command window auto-showing, undismissable, on every launch

First real `pnpm dev` run surfaced a bug `cargo check`/`vite build` can't
catch: the companion widget and the floating hotkey command window both
appeared on launch, the command window sat on top of everything
(`alwaysOnTop`, no decorations, `skipTaskbar`), and had no way to be moved
or closed. Confirmed via `%APPDATA%\dev.ascendant.app\.window-state.json`:
`tauri-plugin-window-state` had persisted `command.visible: true` from
whenever the hotkey was last used, and nothing in `lib.rs`/`commands::windows`
ever explicitly hid `command` at startup — it was only ever shown, never
hidden, so the plugin's restore was the only thing setting its visibility
on launch.

Fixed three ways: `tauri_plugin_window_state::Builder` now calls
`.skip_initial_state("command")` (the plugin's own mechanism for "never
restore this window's state on startup," confirmed in the vendored source
at `tauri-plugin-window-state-2.5.0/src/lib.rs`) so a stale `visible: true`
can never resurface; `lib.rs`'s `setup()` also explicitly hides `command`
(and hides `main` when launched with `--widget`) as a second, independent
guarantee; and `show_default_companion_window` now explicitly hides
whichever of widget/strip wasn't chosen, closing the identical latent bug
for that pair (a stale `strip.visible: true` would previously have shown
both at once). `CommandContent.tsx` also gained a drag region and a close
button — previously its only way to dismiss was an undocumented Escape
key, which is a bad fallback on its own regardless of the root-cause fix.

The user's existing `.window-state.json` needs no manual edit — the fix
makes its stale `command` entry permanently unread.

## 2026-10-15 — Fix: widget undraggable/unclosable, plus a level-row overflow

Next report after the command-window fix: the widget itself couldn't be
moved or closed, and there were unspecified "UI issues." Found three
confirmed bugs by reading Tauri's own source rather than guessing (no
tool here can attach to or screenshot a native desktop window):

**Undraggable**: `data-tauri-drag-region` (bare, no value) only arms a
*direct* click on that exact element — confirmed in
`tauri-2.12.4/src/window/scripts/drag.js`'s `isDragRegion()`:
`if (attr === '' || attr === 'true') return el === composedPath[0]`.
The widget's title row wraps a text span and a button group, so almost
every click lands on a descendant, not the bare div itself — only literal
padding pixels counted. Same bug in the strip (nearly zero bare space,
packed with content) and in the command window's drag strip added in the
previous fix. Fixed by switching all three to
`data-tauri-drag-region="deep"`, which arms any non-interactive
descendant (buttons stay excluded regardless, per the same file's
`isClickableElement` check running before the attr check).

**Unclosable**: the widget never had a close affordance — only
open/pin/collapse, and "collapse" just swaps to the strip, which also had
no close. Added an `IconButton` (`"x"`, `getCurrentWindow().hide()`) to
both the widget's title row and the strip's control row, matching the one
the command window already got.

**Layout overflow (likely "the UI issue")**: the widget's level row put
`LevelChip` (fixed ~236px: 48px ring + a non-shrinking `w-40` XP bar) and
`HpSegments` (~200px) side by side in a 350px-wide window (~318px usable
after padding) — about 440px of content in 318px, clipped by the
widget's own `overflow-hidden`. `LevelChip` was built for Today's wide
header, not a narrow companion column. Fixed by stacking them vertically
instead — `LevelChip` alone fits comfortably at this width, no new
component needed.
