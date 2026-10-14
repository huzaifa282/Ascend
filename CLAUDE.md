# Ascendant: working rules

- Spec: docs/SPEC.md (this build file). Decisions: docs/decisions.md.
- Engine is pure TS in packages/engine. UI never computes XP, HP, levels, ranks or rewards.
- The LLM classifies and extracts only. It never outputs numbers that affect progression.
- Use design tokens from packages/ui/tokens.css. No raw hex, no new radii, no new fonts.
- Today shows only: level chip, clock, music, today's tasks. Do not add components to it.
- One accent per card. Danger and ok always paired with a word.
- Every control: real element, 44px minimum, keyboard reachable, visible focus ring.
- Respect prefers-reduced-motion and html[data-reduced-motion="on"].
- Secrets only in the OS keychain. Never log keys or user text at info level.
- No Spotify Web API. Music = system media (Windows SMTC, Linux MPRIS) + music folder.
- Default hotkey Ctrl/Cmd+Shift+Space.
- Before finishing any task: pnpm lint && pnpm typecheck && pnpm test, and the visual check for UI changes.
- Do not copy the identity of any existing app, game or anime.

## Repo map

- `apps/desktop` — Tauri 2 shell + Vite multi-page build (`main`, `widget`, `strip`, `command` windows).
- `packages/engine` — pure TS rules engine (xp, levels, ranks, hp, rewards, streaks, stats, plausibility). 100% unit tested. Imports nothing from other packages.
- `packages/db` — Drizzle schema, migrations, repositories, seed-time types. Imports `engine`.
- `packages/llm` — provider adapters, prompts, Zod schemas, interpretation pipeline. Imports only `engine` types and zod.
- `packages/ui` — design tokens, Tailwind preset, fonts, primitives, domain components, icons. No data access.
- `packages/app` — screens, stores, hooks, routes, services that call the engine and write ledger events. Wires everything together.
- `packages/seed` — deterministic 60-day demo profile generator, run through the real services.

## Phase status (see docs/decisions.md for the "why" behind each choice)

This build covers spec phases 0–7 (desktop only). Phase 8 (web demo, macOS/Linux
packaging, mobile) is out of scope for this pass. Voice capture (section 11.6) is
stubbed: the mic button is present but disabled, pending a CMake/LLVM toolchain
decision for whisper-rs.
