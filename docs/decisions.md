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
