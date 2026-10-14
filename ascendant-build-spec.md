# Ascendant: Complete Build Specification

> Hand this file to Claude Code at the root of an empty repository. It is the single source of truth for product behaviour, architecture, rules, data, design and build order. Where this file and your instincts disagree, follow this file; where it is silent, choose the simplest option that fits the principles in section 1 and write the decision into `docs/decisions.md`.

---

## 0. How to use this document (instructions for Claude Code)

1. Read the whole file once before writing code.
2. Create `CLAUDE.md` from the template in section 16 so later sessions keep the same rules.
3. Build in the phase order of section 15. Each phase ends with its acceptance checklist passing. Do not start a phase until the previous one passes.
4. The rules engine (section 5) is pure TypeScript with unit tests. Write the tests first from the tables in section 5. No UI may compute XP, HP, levels or rewards itself; it calls the engine.
5. The LLM never produces numbers that affect progression. It classifies and extracts; deterministic code scores (section 6).
6. Use the design tokens in section 8 verbatim. Do not invent colours, radii or fonts.
7. Use realistic seed data (section 14), never lorem ipsum.
8. After every phase: run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and the visual check in section 15.9.

---

## 1. Product summary and principles

**Ascendant** is an open-source, local-first life RPG and daily companion. People say what they did in plain language (typed or spoken). A language model of the user's choice interprets it. Deterministic code turns that into XP, stats, levels and ranks. It is a habit tracker, a task scheduler, a focus timer and a music companion running on one progression system. It can also be used with leveling switched off, as a calm "clock, music and tasks" home screen.

Principles, in priority order:

1. **Simple surface, depth on demand.** The home screen (Today) shows four things: a level chip, a clock, the music that is playing, and today's tasks. Everything else is one click away. Prefer a popup or the next screen over adding a component to a surface. One primary number and one accent per card.
2. **Local-first and private.** All data lives on the device in SQLite. API keys live in the OS keychain. Nothing is sent anywhere except the user's own text to the model provider they chose. Data sharing with the project is opt-in and off by default.
3. **Deterministic progression.** The model interprets; code scores. Same input and same ruleset always give the same XP. Every number shown can be explained from the event ledger.
4. **Instrument-panel feel, softened.** Precise like hardware (tabular numerals, measurement metaphors), but rounded and smooth. No sci-fi glow, no gradients, no emoji, no game-franchise imagery.
5. **Never block the user.** Logging saves instantly; interpretation runs in the background. Offline or no model still works through manual quick-pick.
6. **Accessible by default.** 44px touch targets, keyboard navigation, 4.5:1 text contrast, never colour alone, reduced motion respected, text equivalents for every bar and chart.
7. **Original identity.** Inspired by leveling-system progression in general. Do not copy the visual identity, names, terms or UI of any existing app, game, anime or franchise.

Platforms (in build order): Windows desktop (primary), web demo, macOS and Linux desktop, Android and iOS.

---

## 2. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Desktop shell | **Tauri 2** (Rust backend, system webview) | Small binaries, native APIs from Rust, multi-window for widgets. |
| UI | **React 18 + TypeScript + Vite** | Not Next.js: there is no server; the app is a static bundle inside Tauri. |
| Styling | **Tailwind CSS** mapped to the CSS variables in section 8 + a small `components.css` for complex parts (dial, faders) | Tailwind config reads tokens; no raw hex in components. |
| State | **Zustand** for UI state, **TanStack Query** over the local DB layer | Keep engine pure; stores call repositories. |
| Database | **SQLite** via `tauri-plugin-sql`, schema and queries with **Drizzle ORM** (`sqlite-proxy` driver) | Migrations in `packages/db/migrations`. Web demo uses the same schema on `sql.js` (WASM) or an in-memory adapter. |
| Validation | **Zod** | Shared schemas for LLM output, settings, import/export. |
| LLM calls | `packages/llm` with a provider interface; HTTP through `tauri-plugin-http` (avoids CORS) | Providers: OpenAI, Anthropic, Gemini, OpenRouter, Ollama, LM Studio (OpenAI-compatible). |
| Secrets | Rust `keyring` crate exposed as Tauri commands | Never write keys to SQLite, files or logs. |
| Voice (on-device) | `whisper-rs` (whisper.cpp) with a small English model downloaded on first use; fallback: provider transcription | Model download is opt-in and shows size. |
| Global hotkey | `tauri-plugin-global-shortcut` | See hotkey note in section 11.3. |
| Notifications | `tauri-plugin-notification` (+ Windows toast actions via Rust where needed) | |
| Autostart | `tauri-plugin-autostart` | "Start with system" setting. |
| Window positions | `tauri-plugin-window-state` | Main window and widget remember position and size per display. |
| Files | `tauri-plugin-fs`, `tauri-plugin-dialog` | Music folder, import/export. |
| Music: system media | Rust `windows` crate, `Windows.Media.Control` (GlobalSystemMediaTransportControlsSessionManager) on Windows; `mpris` crate on Linux; macOS: not available via public API, so music folder only | Section 11.1. |
| Music: folder | Rust scan with `lofty` (tags, embedded art) + HTML `<audio>` via Tauri asset protocol | |
| Tests | **Vitest** (engine, llm parsing, repositories), **Playwright** (UI flows, visual snapshots) | |
| Package manager | **pnpm** workspaces | |
| Mobile (later) | Tauri 2 mobile targets reusing the React UI; home-screen widgets in native code (WidgetKit for iOS, Jetpack Glance for Android) | Phase 8. |

Fonts are bundled locally (no network at runtime): **Archivo** variable font with the width axis (`wdth` 62-125, `wght` 100-900) and **Martian Mono** (400, 500, 600). Get them from the `@fontsource-variable/archivo` and `@fontsource/martian-mono` packages and copy the woff2 files into `packages/ui/fonts`.

---

## 3. Repository layout

```
ascendant/
  CLAUDE.md
  package.json            (pnpm workspaces, scripts: dev, build, lint, typecheck, test, e2e)
  pnpm-workspace.yaml
  docs/
    decisions.md          (architecture decisions, one entry per decision)
    ruleset.md            (generated from packages/engine/src/ruleset.ts)
  apps/
    desktop/              (Tauri 2 app)
      src/                (React entry, routes, windows: main, widget, strip)
      src-tauri/
        src/
          main.rs
          commands/       (keychain.rs, media.rs, music_folder.rs, voice.rs, taskbar.rs, windows.rs)
        tauri.conf.json   (windows: main, widget, strip; capabilities)
    web-demo/             (Vite build of the same UI with demo adapters and the DEMO DATA banner)
  packages/
    engine/               (pure TS rules: xp, levels, ranks, hp, rewards, streaks, stats, plausibility; 100% unit tested)
    db/                   (Drizzle schema, migrations, repositories, seed)
    llm/                  (provider adapters, prompts, Zod schemas, interpreter pipeline)
    ui/                   (design tokens, Tailwind preset, fonts, components, icons)
    app/                  (screens, stores, hooks, routes; shared by desktop and web-demo)
    seed/                 (60-day demo profile generator)
```

Rule: `engine` imports nothing from other packages. `llm` imports only `engine` types and Zod. `ui` has no data access. `app` wires everything.

---

## 4. Domain model and database

All tables have `id TEXT PRIMARY KEY` (ULID), `created_at INTEGER` (ms epoch), `updated_at INTEGER`. Times are stored in UTC ms; the profile stores an IANA timezone and the engine works in that local day. The **event ledger** (`xp_events`, `stat_events`, `hp_events`) is append-only; totals are derived and cached in `profile` and `stats` but can always be recomputed by replaying the ledger with the current ruleset (Settings "Recalculate from history").

### 4.1 Tables

```
profile
  name TEXT, timezone TEXT, tone TEXT ('strict'|'neutral'|'encouraging'),
  leveling_enabled INTEGER (1), level INTEGER, xp_into_level INTEGER, total_xp INTEGER,
  rank TEXT ('E'|'D'|'C'|'B'|'A'|'S'), hp INTEGER, equipped_title_id TEXT NULL,
  streak_days INTEGER, streak_frozen_until INTEGER NULL,
  penalty_zone_since INTEGER NULL, onboarding_done INTEGER

settings            (single row, JSON columns validated by Zod: model, voice, notifications,
                     quiet_hours, widget, music, timer, appearance, data_sharing, ruleset_overrides, hotkey)

stats               code TEXT UNIQUE ('STR','END','AGI','VIT','INT','FOC','CRE','CHA','DIS'),
                    name TEXT, sort INTEGER, hidden INTEGER, stat_xp INTEGER, value INTEGER,
                    last_trained_at INTEGER NULL

entries             raw_text TEXT, source TEXT ('typed'|'voice'|'widget'|'manual'),
                    status TEXT ('queued'|'interpreting'|'needs_confirm'|'confirmed'|'discarded'|'error'),
                    error TEXT NULL, model TEXT NULL, tokens_in INTEGER, tokens_out INTEGER

entry_items         entry_id, kind TEXT ('log'|'task'|'reschedule'|'question'|'complete_task'),
                    payload JSON (the validated LLM item), status TEXT ('pending'|'accepted'|'removed'),
                    plausibility TEXT ('ok'|'flagged'|'confirmed'), resolved_xp INTEGER NULL

activities          entry_item_id NULL, title TEXT, skill_id NULL, started_at, duration_min INTEGER,
                    intensity TEXT ('light'|'moderate'|'hard'), distance_km REAL NULL,
                    stat_weights JSON ({code: weight}), xp INTEGER, multiplier REAL, timer_session_id NULL

tasks               title TEXT, notes TEXT, due_at INTEGER NULL, window_start INTEGER (creation or start),
                    difficulty INTEGER 1-5, est_minutes INTEGER NULL, stat_weights JSON,
                    reminder_minutes JSON ([120, 30]), status TEXT ('open'|'done'|'failed'|'cancelled'),
                    completed_at NULL, reward_tier TEXT NULL, xp_awarded INTEGER NULL,
                    reschedule_count INTEGER, main_quest_id NULL, emergency INTEGER, expires_at NULL

dailies             title TEXT, stat_weights JSON, xp INTEGER, recurrence JSON (rrule-lite: daily|weekdays|custom days),
                    active INTEGER, sort INTEGER
daily_completions   daily_id, local_date TEXT ('YYYY-MM-DD'), completed_at, activity_id NULL

main_quests         title, description, target_date NULL, status
skills              name, stat_codes JSON, xp INTEGER, level INTEGER, minutes INTEGER, last_trained_at
skill_suggestions   name, stat_codes JSON, evidence_count INTEGER, status ('open'|'approved'|'dismissed')
titles              key TEXT UNIQUE, name, description, rule JSON, earned_at NULL
rank_trials         from_rank, to_rank, started_at, days JSON ([{date, xp, dailies_done, passed}]), status
timer_sessions      kind ('focus'|'break'), planned_min, started_at, ended_at NULL, paused_ms INTEGER,
                    task_id NULL, daily_id NULL, skill_id NULL, status ('running'|'paused'|'done'|'stopped')
shields             month TEXT ('YYYY-MM'), used_on TEXT NULL (local date)
xp_events           at, amount INTEGER, reason TEXT, ref_type TEXT, ref_id TEXT, multiplier REAL
stat_events         at, stat_code, stat_xp INTEGER, ref_type, ref_id
hp_events           at, delta INTEGER, reason TEXT, capped_from INTEGER NULL, ref_type, ref_id
system_messages     at, kind ('gain'|'ok'|'info'|'danger'), template_key TEXT, params JSON, read INTEGER
chat_messages       role ('user'|'assistant'), text, at
music_tracks        path TEXT UNIQUE, title, artist, album, duration_s, art_path NULL, folder TEXT
share_queue         level ('anonymous'|'feedback'), payload JSON, status ('pending'|'removed'|'sent'), sent_at NULL
```

### 4.2 Repositories

`packages/db/src/repos/*.ts`, one per aggregate, each returning plain objects typed by Drizzle's inferred types. Repositories never compute rules; services in `packages/app/src/services` call the engine and then write events through repositories inside a single transaction.

---
## 5. Rules engine (`packages/engine`)

Pure functions, no I/O, no `Date.now()` inside (time is always passed in). Every constant lives in `src/ruleset.ts` as one exported `DEFAULT_RULESET` object; Settings "Ruleset tuning" stores overrides that are merged over it. Generate `docs/ruleset.md` from it with a script. Each subsection below lists the rule and the unit tests to write.

### 5.1 Stats

Nine stats with fixed codes; names can be renamed, reordered or hidden (codes never change):

| Code | Default name | Typical sources |
|---|---|---|
| STR | Strength | lifting, calisthenics, manual work |
| END | Endurance | running, cycling, swimming, long walks |
| AGI | Agility | stretching, yoga, sports, dance |
| VIT | Vitality | sleep, nutrition, hydration, rest, health habits |
| INT | Intellect | study, reading, coding, courses |
| FOC | Focus | deep work, focus sessions, meditation |
| CRE | Creativity | music, art, writing, design |
| CHA | Charisma | calls, meetings, networking, presenting, social time |
| DIS | Discipline | planning, chores, keeping promises, deadlines met |

Stat presets (Settings): **Student** (renames CHA to "Social", emphasises INT/FOC/DIS in suggestions), **Athlete** (STR/END/AGI/VIT first), **Creator** (CRE/FOC/CHA first). Presets only change names, order and visibility.

Each activity carries `stat_weights` (codes to weights summing to 1, max 3 stats). Stat XP for a stat = activity XP x weight.

Stat value shown on the fader (0-99, soft cap):

```
value(stat_xp) = floor(100 * (1 - exp(-stat_xp / STAT_SCALE)))     STAT_SCALE = 2000, capped at 99
stat_level     = floor(value / 10)
today_gain     = value(now) - value(at local midnight)
```

Neglect: a visible stat untrained for `NEGLECT_DAYS = 5` local days shows the Idle tag. If `ruleset.neglect_decay` is true (default true), from day 6 each day close removes stat XP equal to one value point (never below 0); written as `stat_events` with reason `decay`.

Tests: value monotonic, cap 99, decay only after day 5, hidden stats never decay.

### 5.2 Activity XP

```
xp_raw  = round(min(duration_min, 240) * BASE_RATE * INTENSITY[intensity])
          BASE_RATE = 1.0, INTENSITY = { light: 0.8, moderate: 1.0, hard: 1.3 }
per-stat daily soft cap: once a stat has received STAT_DAILY_CAP = 120 stat XP today,
          further stat XP to it is multiplied by 0.25
xp_final = round(xp_raw * cap_factor * penalty_factor * plausibility_factor)
          penalty_factor = 0.5 in Penalty Zone else 1
          plausibility_factor = 0.2 while flagged, 1 once confirmed
```

`cap_factor` is the weight-averaged factor across the activity's stats. Total XP and stat XP both use the capped amounts. Show the explanation in the confirm card ("Capped: Endurance already +120 today").

Tests: cap boundary exactly at 120, multi-stat split, penalty halving, plausibility restore on confirm.

### 5.3 Levels and ranks

```
xp_needed(level) = roundToNearest50(100 + 126 * level)     // level 23 -> 3,000
```

Level up: carry over excess XP, restore HP to max, write a `level_up` system message, check titles.

Ranks by level band: E 1-9, D 10-24, C 25-39, B 40-59, A 60-79, S 80+.
Reaching the first level of the next band **unlocks** a 7-day rank trial; the rank changes only when the trial is passed. Trial day passes if that local day has at least `TRIAL_DAY_XP = 90` XP and every active daily done. A failed day restarts the trial from day 1 with no HP cost. Without passing, level is capped at `band_start_of_next_rank + 4` (XP keeps banking and applies immediately after passing). Rest-shield days pause the trial (neither pass nor fail).

Tests: thresholds, cap and banking, trial restart, shield pause.

### 5.4 HP, Penalty Zone, rest days

- HP max 100, start 100.
- Day close (local midnight, or first app open after it; process all missed days in order):
  - each active daily not done: `-4` HP (skipped on shield days),
  - all dailies done: `+5` HP,
  - streak update (5.6), neglect decay (5.1), trial day evaluation (5.3).
- Failed task (24h past due, still open): `-(2 + 2 * difficulty)` HP.
- **Daily HP-loss cap**: total HP loss per local day is capped at `HP_DAILY_LOSS_CAP = 20`. When a loss is reduced, store `capped_from` and show "Penalty reduced by the daily cap: -12 became -4."
- HP <= 30: show HP in `danger` and send the "HP low" notification once per day.
- **Penalty Zone** when HP reaches 0: set `penalty_zone_since`, all XP x0.5, create the recovery quest: within 24h either complete 3 tasks that were overdue at entry, or finish one focus session of at least 60 minutes. On success: HP becomes 30, exit, system message, exit screen. On expiry: streak resets to 0 and a new 24h recovery quest starts.
- **Rest-day shields**: 2 per calendar month. Using one freezes dailies and the streak for that local day (no HP loss, streak neither breaks nor grows, trial paused). Deadline tasks still run. Cannot be used retroactively for a day already closed.

Tests: cap math, penalty entry and exit, recovery via either path, shield effects, multi-day catch-up.

### 5.5 Tasks with deadlines and reward tiers

```
BASE = { 1: 20, 2: 40, 3: 70, 4: 110, 5: 160 }               // by difficulty
EST_DEFAULT = { 1: 15, 2: 30, 3: 60, 4: 120, 5: 240 }        // minutes, if est_minutes missing
window   = due_at - window_start            (minutes)
pressure = clamp(est / window, 0.02, 1)
ambition = 0.8 + 0.7 * sqrt(pressure)       // 0.9 .. 1.5
label: ambition >= 1.3 && difficulty >= 4 -> "High risk, high reward"
       ambition <= 0.95 && difficulty <= 2 -> "Low reward"
base_reward = round(BASE[difficulty] * ambition)
```

Completion tier (r = remaining minutes before due / window):

| Tier | Condition | Reward |
|---|---|---|
| Early | r >= 0.5 | base x 1.25 |
| Early (scaled) | 0.1 <= r < 0.5 | base x (1.10 + 0.15 x (r - 0.1) / 0.4) |
| On time | 0 <= r < 0.1 | base x 1.10 |
| Grace | 0 < late <= grace_len, grace_len = clamp(0.25 x window, 15, 120) min | base x (1 - 0.5 x late / grace_len) (100% to 50%, show live %) |
| Late | after grace, up to due + 24h | base x 0.30 |
| Failed | still open at due + 24h | 0 XP, HP penalty (5.4) |

Reschedule: the first reschedule of a task is free; each later one multiplies the eventual reward by 0.95 (floor 0.70). Show the cost before confirming. Rescheduling resets `window_start` to now only if the new due date is later than the old one.

Task XP flows to stats by the task's `stat_weights` (default DIS 1.0).

Emergency quests: system-generated optional tasks (e.g. when 2+ tasks are overdue): fixed reward 120 XP and +10 HP, expire in 4h, Accept or Decline; declining has no cost.

Tests: every tier boundary, grace minimum and maximum, reschedule floor, ambition labels.

### 5.6 Daily quests and streak

- Dailies have a fixed XP (default by size: 20 / 40 / 60 / 80) and stat weights. Completion: checkbox, auto-match from a log (6.5), or a timer session linked to it.
- Reset at local midnight. Streak: a local day counts if at least one daily is done or the day earned 30+ XP. Missing a day resets the streak to 0 (shield days are frozen).

### 5.7 Focus timer

- Presets 25 / 50 / 90 minutes or custom (5-180). Breaks 5 / 10 / 15. Sessions per cycle: 4.
- On session end (completed or stopped after >= 10 minutes), create an activity: duration = focused minutes (pauses excluded), intensity moderate, stat weights from the linked task/daily/skill, else `FOC 0.7, DIS 0.3`. Stopped under 10 minutes: nothing is credited.
- A pause longer than 10 minutes ends the session (credit what was done) and offers to start a new one.
- The live "+N XP so far" is a projection with the same formula; it is credited only at the end.

### 5.8 Skills

- Skill XP = activity XP. `skill_level = floor(sqrt(skill_xp / 50)) + 1`. Track minutes and last trained.
- Skills belong to 1-3 stats. Suggestion: an unlinked activity label (normalised) seen 5+ times in 21 days creates a skill suggestion (approve or dismiss; dismissed labels are not suggested again for 60 days).

### 5.9 Plausibility rules (deterministic)

Flag an activity (XP x0.2 until the user confirms) when any rule trips:

| Activity class | Rule |
|---|---|
| running | speed > 25 km/h or < 3 km/h with distance |
| walking | speed > 8 km/h |
| cycling | speed > 60 km/h |
| swimming | speed > 6 km/h |
| any | single activity > 8 h; total logged today > 16 h; duration 0 with nonzero XP |
| reading | > 150 pages per hour |

The confirm card shows the reason in words ("Implausible: 150 km/h").

### 5.10 Titles

Rules are data (`titles.rule` JSON) evaluated by the engine after each confirmed item and at day close. Ship these:

| Key | Name | Rule |
|---|---|---|
| first_light | First Light | first confirmed log |
| early_riser | Early Riser | a log before 08:00 on 7 consecutive days |
| steady_hand | Steady Hand | 20 tasks finished on time or early |
| iron_week | Iron Week | all dailies done 7 days in a row |
| night_owl | Night Owl | logs after 01:00 on 5 different days |
| marathon_mind | Marathon Mind | 300 focus hours total |
| polymath | Polymath | skill level 5 in skills under 4 different stats |
| comeback | Comeback | leave the Penalty Zone |

Earning a title shows the small overlay (equip now or later). One equipped title shows on Status and the share card.

---

## 6. Interpretation pipeline (`packages/llm`)

### 6.1 Flow

1. User submits text (or voice transcript) in the command bar. Immediately insert `entries` row with `status = queued` (or `interpreting` when a model is connected). The UI shows "Saved. Scoring in background."
2. Build context (6.3) and call the provider with the system prompt (6.4) asking for JSON matching `InterpretationSchema` (6.2). Use the provider's JSON/structured-output mode where available; otherwise instruct JSON-only and extract the first JSON object.
3. Validate with Zod. On failure, retry once with the validation error appended. On second failure set `status = error` and offer manual quick-pick.
4. Post-process deterministically: resolve times (6.5), run plausibility (5.9), match dailies (6.5), compute XP preview with the engine.
5. Show the confirm card. Accept all (Enter) writes activities, tasks and events in one transaction. Edit opens each item in a form. Discard keeps the raw entry with `status = discarded` (visible in History).
6. Record `tokens_in`, `tokens_out` and model name on the entry; Settings shows token usage per day.

Offline or no model: entries stay `queued`, a banner says "1 entry will be interpreted when connected", and the manual quick-pick (stat chips + minutes) creates an activity directly with default intensity.

### 6.2 Output schema (Zod)

```ts
const StatCode = z.enum(['STR','END','AGI','VIT','INT','FOC','CRE','CHA','DIS']);
const Weights = z.array(z.object({ code: StatCode, weight: z.number().min(0.05).max(1) })).min(1).max(3);

const LogItem = z.object({
  kind: z.literal('log'),
  summary: z.string().max(80),            // "Morning run, 5 km"
  activity_class: z.string().max(40),     // "running", "reading", "deep work"... used by plausibility
  skill: z.string().max(40).nullable(),   // "Running", "TypeScript"
  duration_min: z.number().int().min(1).max(960).nullable(),
  intensity: z.enum(['light','moderate','hard']),
  distance_km: z.number().positive().nullable(),
  pages: z.number().int().positive().nullable(),
  started_text: z.string().nullable(),    // "this morning", "at 7"
  stats: Weights,
  matches_daily_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
const TaskItem = z.object({
  kind: z.literal('task'),
  title: z.string().max(80),
  due_text: z.string().nullable(),        // verbatim phrase: "tomorrow at 7"
  difficulty: z.number().int().min(1).max(5),
  est_minutes: z.number().int().positive().nullable(),
  stats: Weights,
  reminder_minutes: z.array(z.number().int().positive()).max(3).nullable(),
});
const RescheduleItem = z.object({ kind: z.literal('reschedule'), task_id: z.string(), due_text: z.string() });
const CompleteItem   = z.object({ kind: z.literal('complete_task'), task_id: z.string() });
const QuestionItem   = z.object({ kind: z.literal('question'), intent: z.enum(['left_today','xp_today','next_deadline','stat_status','other']), text: z.string() });

export const InterpretationSchema = z.object({
  items: z.array(z.discriminatedUnion('kind', [LogItem, TaskItem, RescheduleItem, CompleteItem, QuestionItem])).min(1).max(6),
});
```

The model never outputs XP, HP, levels or reward percentages.

### 6.3 Context sent with each request

- Local date, weekday, time and timezone.
- The 9 stats (code, current name, one-line description from 5.1).
- Active dailies: id, title, stat codes.
- Open tasks: id, title, due (local), so reschedules and completions can reference ids.
- Known skills: name and stats (max 50, most recent first).
- Nothing else. No history beyond this, no other personal data.

### 6.4 System prompt (store in `packages/llm/src/prompts/interpret.ts`)

```
You turn a person's short note about their day into structured items for a habit and task app.
Return only JSON that matches the provided schema. Do not invent numbers for points, XP or rewards.

Rules:
- One sentence can contain several items. Split them.
- "log" = something they did. "task" = something to do later. "reschedule" = move an existing task (use its id).
  "complete_task" = they finished an existing open task (use its id). "question" = they are asking something.
- Pick 1 to 3 stats that the activity trains, with weights that sum to 1. Use the stat descriptions given.
- Use null when a value is not stated and cannot be reasonably inferred. Do not guess distances or durations wildly.
- Keep times as the user's words in due_text / started_text. Do not convert them.
- If the activity clearly completes one of the listed daily quests, put its id in matches_daily_id.
- difficulty for tasks: 1 trivial, 2 easy, 3 normal, 4 hard, 5 very hard.
- confidence is how sure you are about the whole item, 0 to 1.
```

### 6.5 Deterministic post-processing

- **Times**: resolve `due_text` and `started_text` with `chrono-node` using the profile timezone and "now". If an hour from 1 to 11 has no am/pm and both readings are in the future within 24h, mark ambiguous and show the inline choice "7:00 AM or 7:00 PM?". If chrono fails, show a date-time picker in the item.
- **Daily match**: accept `matches_daily_id` only if it exists and the daily is not already done today; also run a local fuzzy match (normalised tokens, Jaccard >= 0.5) as a fallback suggestion. Show "This completes Read 20 pages."
- **Questions**: intents `left_today`, `xp_today`, `next_deadline`, `stat_status` are answered by code from the database with templated sentences; `other` goes to Ask the System (6.6).
- **Confidence < 0.5**: open the item in edit mode by default.

### 6.6 Ask the System (chat)

Separate prompt with a compact summary: level, rank, HP, streak, today's XP, last 14 days XP per day, stat values and 7-day gains, open tasks with due times, dailies done today. Answers in the selected tone, 2-5 sentences, plain text, no markdown headers. Suggested prompts: "What should I focus on this week?", "What is left today?", "Why did my HP drop?", "Plan my week".

### 6.7 Providers

Interface:

```ts
interface Provider {
  id: 'openai'|'anthropic'|'gemini'|'openrouter'|'ollama'|'lmstudio';
  listModels(): Promise<string[]>;
  complete(req: { system: string; messages: Msg[]; json?: boolean; maxTokens: number }): Promise<{ text: string; tokensIn: number; tokensOut: number }>;
  test(): Promise<{ ok: boolean; latencyMs: number; error?: ProviderError }>;
}
type ProviderError = 'bad_key' | 'rate_limited' | 'provider_down' | 'model_missing' | 'network';
```

Map HTTP 401/403 to `bad_key`, 429 to `rate_limited` (respect `retry-after`), 5xx to `provider_down`. Ollama and LM Studio use their OpenAI-compatible local endpoints (`http://127.0.0.1:11434/v1`, `http://127.0.0.1:1234/v1`) and need no key. Queue retries with backoff (2 min) for `rate_limited` and `provider_down`; never drop an entry.

### 6.8 System messages and tone

System feed messages are **templates, not LLM output**. `packages/app/src/system/messages.ts` maps `template_key` to three strings (strict, neutral, encouraging) with `{params}`. Examples:

| Key | Neutral | Strict | Encouraging |
|---|---|---|---|
| stat_up | Focus increased by 3. | Focus +3. | Focus is up 3. Nice work. |
| quest_done | Quest complete: Read 20 pages. +40 XP. | Quest complete. +40 XP. | Read 20 pages, done. +40 XP. |
| deadline_missed | Deadline missed. HP decreased by 8. | Deadline missed. HP -8. Do not repeat it. | That one slipped. HP is down 8, and you can win it back today. |
| title_earned | Title earned: Early Riser. | Title earned: Early Riser. | You earned Early Riser. |
| level_up | Level 24 reached. HP restored. | Level 24. HP restored. | Level 24! HP is full again. |

Write all copy as short plain log sentences, full stop, no exclamation marks except in Encouraging, no emoji.

---
## 7. App structure, navigation and windows

### 7.1 Desktop windows (Tauri)

| Label | Size | Config | Purpose |
|---|---|---|---|
| `main` | 1280x800 default, min 900x640, resizable | decorations on (custom title area optional later) | The app. |
| `widget` | 350x640 fixed | `decorations: false`, `transparent: true`, `alwaysOnTop` (setting), `skipTaskbar: true`, `resizable: false`, `shadow: true` | Expanded desktop companion widget. |
| `strip` | 560x76 fixed | same as widget | Compact strip; replaces `widget` when collapsed. |

- Only one of `widget` / `strip` is visible. Collapse and expand swap them at the same top-left position.
- Drag with `data-tauri-drag-region` on the widget's title row and the strip's empty areas.
- `tauri-plugin-window-state` restores position per display; if the saved position is off-screen, snap to the bottom-right of the primary display with a 24px margin.
- Clicking the level row, artwork or the open icon emits `open-main` with a route; the Rust side shows, unminimises and focuses `main` and the front end navigates.
- Closing `main` hides it to the tray when the widget is enabled (tray menu: Open, Show widget, Start focus, Quit).

### 7.2 Routes (main window)

```
/today                (home)
/status               (level, XP, HP, stats; links to skills, system feed, weekly report)
/status/stat/:code    (stat detail)
/status/skills
/status/system        (feed + Ask the System)
/status/report        (weekly report + share card export)
/quests               (tabs: today, week, main)
/quests/:id           (task sheet)
/music
/history              (tabs: log, calendar, titles)
/settings/:section
/focus                (full-screen focus mode, no chrome)
/onboarding/:step
```

Sidebar (200px): **Today, Status, Quests, Music, History, Settings** (six items). Leveling off: **Today, Tasks, Music, History, Settings** (Quests becomes Tasks, Status hidden). Sub-pages highlight their parent.

Top bar: the command bar spanning the content width; nothing else. Bottom: the player bar on every route except Today, Music and Focus.

Mobile tabs: **Today, Quests, Log (centre, accent, opens voice capture), Focus, History**. Settings opens from a gear on Today.

### 7.3 Front-end state

- `useProfile`, `useStats`, `useToday`, `useTasks`, `useTimer`, `useMusic`, `useSettings` hooks (TanStack Query over repositories; invalidate on events).
- A single `EventBus` (typed) for `entry:saved`, `entry:interpreted`, `xp:gained`, `level:up`, `rank:up`, `title:earned`, `hp:changed`, `penalty:entered`, `penalty:exited`, `timer:tick`, `music:changed`. Toasts, sounds and moments subscribe to it.
- Timer state lives in Rust (so it survives the main window closing and drives the widget); the front end subscribes to `timer:tick` (1 Hz).
- Music state lives in Rust (SMTC session or the built-in player bridge) and is broadcast as `music:changed` with `{ source, app_name, title, artist, album, art_data_url, position_s, duration_s, playing }`.

---

## 8. Design tokens (use exactly)

### 8.1 Colour

Dark theme only. The accent is swappable at runtime with `data-theme` on `<html>`.

```css
:root, [data-theme="azure"] {
  --bg: #0B0D12;          /* app background (cool ink) */
  --surface: #151A23;     /* tracks, inputs, empty segments, hover fills */
  --rule: #262C38;        /* 1px hairlines between regions, control borders */
  --rule-soft: #1A1F29;   /* row separators inside lists */
  --text: #E8ECF2;        /* primary text, filled bars (16:1 on bg) */
  --text-muted: #8E98A8;  /* labels, metadata (6.7:1 on bg, 6.0:1 on surface) */
  --accent: #3D7BFF;      /* XP, today's gains, primary actions only (5.1:1 on bg, 4.55:1 on surface) */
  --on-accent: #0B0D12;   /* text/icons on accent fills */
  --danger: #FF7A7A;      /* overdue, HP loss, Penalty Zone; always with a word */
  --danger-wash: #2A1519; /* late rows, penalty banner background */
  --ok: #7BD88F;          /* connected, on track, early/on-time, breaks; always with a word */
}
[data-theme="ember"] { --accent: #FF5A1F; }
[data-theme="acid"]  { --accent: #D4FF3A; }
[data-theme="mono"]  { --accent: #E8ECF2; }
```

Rules: one accent, used sparingly (XP, today's gains, the primary button, the running timer). If everything is blue, nothing is. Danger and ok always come with a word (LATE, FAILED, PENALTY ZONE, CONNECTED). No gradients, glows or glassmorphism. Shadows only on floating windows and modals. The modal scrim is `rgba(5,7,10,.62)`.

### 8.2 Type

Fonts: `--font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;` and `--font-mono: "Martian Mono", ui-monospace, "SF Mono", Menlo, monospace;`. Body default `font-stretch: 112%`. Numerals and headings `font-stretch: 125%`. `font-variant-numeric: tabular-nums` everywhere numbers change.

| Style | Family | Size / line | Weight | Use |
|---|---|---|---|---|
| numeral-xl | display 125% | 160/152 (120-200) | 800 | Level numeral on Status, level-up moment |
| numeral-l | display 125% | 72/68 | 700 | Today clock, large countdowns |
| numeral-m | display 125% | 40/40 | 700 | XP value, key figures |
| numeral-s | display 125% | 24/24 | 700 | fader values, widget figures |
| heading-l | display 125% | 28/32 (Today greeting 32/38) | 700 | screen titles |
| heading-m | display 118% | 18/24 | 600 | card titles, task titles |
| body | display 112% | 15/22 | 400 | text, settings copy |
| label | mono | 10.5-11/16, letter-spacing .12em, UPPERCASE | 500 | section labels (text-muted) |
| meta | mono | 11/16, letter-spacing .04em | 400 | timestamps, durations, codes |
| mono-body | mono | 13/20 | 400 | System messages |
| command | mono | 15-16/24 | 400 | command bar, transcript |

### 8.3 Spacing, radius, elevation, sizes

```css
--space-half: 4px; --space-1: 8px; --space-2: 16px; --space-3: 24px; --space-4: 32px; --space-5: 48px; --space-6: 64px; --space-7: 96px;
--radius-xs: 3px;   /* HP segments, small bars, pips */
--radius-sm: 6px;   /* key caps, type tags, checkbox boxes */
--radius-md: 10px;  /* buttons, inputs, icon buttons, rank badges, segmented controls */
--radius-lg: 16px;  /* cards, panels, windows, command bar, notifications, widget */
--radius-xl: 28px;  /* phone frame, mobile home-screen widgets */
--radius-pill: 999px; /* badges, toggles, progress bars, compact strip, round buttons (50%) */
--shadow-window: 0 24px 64px #000000b3, 0 0 0 1px #262c38;  /* floating windows and modals only */
--touch-min: 44px;
```

Nested corners: inner radius = outer radius minus padding. Rows inside a rounded card stay full-bleed and the card clips them (`overflow: hidden`). Regions inside a card are split by 1px `--rule`; list rows by `--rule-soft`.

### 8.4 Motion

Default 150-250ms `ease-out`. Controls ease colour and border over 200ms and press to `scale(.98)`. Numbers count up over 600ms (ease-out cubic). Bars fill from the left; fader fills and HP segments grow up (20ms stagger). The level-up numeral roll is the one long animation (900ms `cubic-bezier(.2,.8,.2,1)`, 80ms stagger per digit). Respect `prefers-reduced-motion` and the in-app toggle (`html[data-reduced-motion="on"]`): every animation becomes an instant state change.

### 8.5 Accessibility

- Every interactive element is a real `button`, `a`, `input` or has the matching role; minimum 44x44px.
- Focus ring: 2px solid `--text`, 2px offset, on `:focus-visible`.
- Full keyboard navigation: Tab order follows reading order; Esc closes popups; Enter accepts the confirm card; arrow keys move sliders.
- Bars, rings, dials, faders and charts carry `role="img"` (or `slider`/`timer`) with an `aria-label` text equivalent.
- Never colour alone: overdue says LATE, idle stats say Idle, HP low says low.
- Live regions: toasts and System messages use `aria-live="polite"`; Penalty Zone entry uses `assertive`.

### 8.6 Icons

Inline SVG, 24px grid, 1.6px stroke, square caps, `currentColor`. Needed set: home, gauge, list, note, cal, gear, timer, mic, check, x, edit, plus, pin, expand, collapse, warn, shield, clock, enter, chat, bolt, chev, lock, share, trash, rest (moon), stop, prev, next, play (filled), pause (filled), shuffle, repeat, heart, vol, ext, folder, copy, speaker, queue, search. Draw them as simple geometric paths; do not import a third-party icon set that has a recognisable style.

---

## 9. Components (`packages/ui`)

Build each as a React component with a Storybook-free "kitchen sink" route (`/dev/components`) that renders every state. Props below are the minimum.

### 9.1 Primitives

- **Button**: variants `default` (1px rule border, transparent), `primary` (accent fill, on-accent text, hover to `--text` fill), `danger` (danger border and text), `ghost`. Size md (44px high, 16px horizontal padding) and sm (44px high, 12px padding, 10.5px label). Label is mono uppercase .1em tracking, `white-space: nowrap`, `flex: none`.
- **IconButton**: 44x44, radius md; **RoundButton** (`.a-cbtn`): 44x44 circle, text-muted, hover surface fill; **PlayButton**: 52px circle (44 small, 64 large, 80 xl), `--text` fill, `--bg` icon, hover accent.
- **Toggle**: 44x24 pill, 16px knob; on = accent border and knob. `role="switch"`.
- **Segmented**: rounded container, mono uppercase options, selected option `--text` fill with `--bg` text, never wraps.
- **Tabs**: mono uppercase, 2px underline in `--text` for the selected tab.
- **Badge**: pill, mono uppercase 10.5px; tones ok, mid (text), danger, danger-fill, muted.
- **TypeTag**: LOG (outlined) and TASK (filled `--text`), radius sm.
- **Checkbox** (quest rows): 44x44 hit area with a 22px rounded-sm box; done = filled `--text` with a `--bg` check.
- **Card**: `--bg` fill, 1px `--rule`, radius lg, overflow hidden; header 48-56px with a label or heading-m title and optional right action.
- **Modal**: 460px wide, radius 20px, shadow-window, header (title + close), body, footer (secondary left, primary right); scrim covers the window; focus trapped; Esc closes.

### 9.2 Domain components

| Component | Spec |
|---|---|
| **StatFader** | Width 72. Head: value (numeral-s 22px) and, only if gain > 0, `+N` in accent mono 11px beside it. Body: 136px tall, 10px wide pill track in `--surface`; fill pill in `--text` grows from the bottom to `value%`; the top part of the fill (gain / value) is an accent cap (min 7px). No tick scale. Foot: code (mono 11 bold .1em) and name (display 11.5, muted). Neglected: fill turns `--text-muted`, plus an `Idle 6d` danger pill. Dense variant (phones, cards): 36 wide, 96 tall track 8px, no name, no gain text. `role="img"` label "Focus: 58 of 100, plus 3 today". Click opens stat detail. |
| **XpRuler** | Big XP numeral, "/ 3,000 XP", "660 TO LEVEL 24" right-aligned; 16px pill bar (fill `--text`, today's gain segment accent after it); 50-division tick row below (every 5th major in text-muted, others rule); footer LV 23 / +186 XP TODAY / LV 24. Compact variant: bar + ticks only. |
| **HpSegments** | 10 segments, 4px gap, radius xs, 20px tall (12px small); filled `--text`, <= 30 HP filled `--danger`; number + "/100". |
| **Countdown** | Parts DD:HH:MM(:SS) with tiny unit labels; sizes 72/40/24/16; `warn` (last hour) = accent; `late` = danger with a "LATE +" tag. `role="timer"`. |
| **RewardBadge** | Early (ok, "up to +25%"), On time (ok, "+10%"), Grace (text, live "NOW 78%"), Late (danger, "30%"), Failed (danger fill, "-8 HP"), Rest (muted, "frozen"). |
| **QuestRow** | 56px row: checkbox, title (+ optional meta line), optional right slot (badge or countdown), stat code, XP in accent; done = strikethrough muted; late = danger-wash background and danger title. |
| **ConfirmCard / ConfirmItem** | Header "N ITEMS FROM ONE SENTENCE" + model name. Each item: TypeTag, summary, meta chips (duration, intensity, skill, resolved due "THU 15 OCT 07:00", "FROM TOMORROW AT 7", reminder), stat gains ("+12 Endurance" with accent numbers), XP; optional plausibility warning (danger-wash row, warning icon and sentence, "(reduced)"), ambiguity choice (label above two buttons), daily match line (ok check, "This completes Read 20 pages."). Item actions accept / edit / remove (44px icon buttons) wrap below content on narrow widths. Footer: TOTAL +XP and token count on one line; Discard, Edit, Accept all (Enter) wrap to their own row when narrow. |
| **CommandBar** | Rounded lg container on `--surface`: accent `>` prompt, mono input (ellipsis), hotkey hint key cap, mic RoundButton. Optional status strip (connected, listening, interpreting sweep, offline queued, error with fix) used inside popups and widgets; hidden in the main top bar. |
| **MicButton + Waveform** | Mic round 44 (88 on mobile capture). Recording: accent fill, stop square icon, `aria-pressed`. Waveform: 40 thin bars in accent animating 35-100% height with stagger; idle bars flat muted. Transcript box: dashed rule, mono 16px, final text in `--text`, live tail in muted, blinking accent caret; stays editable. |
| **SystemMessage** | Row: 6px status dot (accent gain, ok, danger, rule), mono timestamp (84px column), mono-body sentence. New messages flash accent background for 600ms. |
| **Notification** | 360px floating card (radius lg, shadow): header app + tag + time, title heading-m, one meta line, footer actions as equal buttons (first is the primary, accent text). Danger variant uses danger border. Mobile variant full width, no shadow. |
| **RankBadge / LevelRoll** | Rank: rounded square letter (current filled `--text`, locked rule). Rank scale E D C B A S. LevelRoll: each digit a vertical strip of 0-9 twice, animated from old to new with translateY in em units. |
| **XpStrip** | 61 bars of daily XP, rounded tops, muted at 55% opacity, today in accent, zero days as thin rule bars; footer "61 DAYS AGO / AVG / BEST / TODAY". |
| **LevelChip** | Button: 48px ring (accent arc on surface track, level number centred), "Level 23", "Rank D" badge, 160x6 XP pill bar, "2,340 / 3,000 XP". Opens Status. |
| **ClockCard** | Today's timer surface. Whole card is a button that opens the TimerModal: label (FOCUS in accent, BREAK in ok, FOCUS TIMER muted when idle), 72px numerals, 4px progress pill (accent; ok on break), the linked task in meta caps. A separate 52px PlayButton bottom-right (pause while running; accent-filled play when idle). |
| **TimerModal** | Dial (180px) + stop / pause / +5 round buttons; rows: Length (25/50/90/Custom), Break (5/10/15), Working on (select of open tasks, dailies, skills), Play music when it starts (toggle), Sound at the end (toggle), Start breaks automatically (toggle); footer Full screen / Done. |
| **Dial** | 60 ticks around a circle (majors every 5), track `--surface`, elapsed arc accent with round caps (ok on break), ticks for elapsed minutes turn `--text`; centre label, numerals (0.2 x size), "OF 50:00". Below 160px: numerals only. `role="timer"`. |
| **MusicCard** | Card: 64px art (radius 12), title (heading-m 15, ellipsis), artist (meta), prev / play / next, thin 4px seek pill with 10px thumb, "1:37 / 4:12" and "VIA SPOTIFY APP" (the playing app's name from system media) or "MUSIC FOLDER". Empty: note icon tile, "Nothing playing", "START ANY PLAYER", Open folder button. |
| **NowPlaying (large)** | Music page: 168px art, title 20px, artist / album, save, queue, output buttons, seek with times, shuffle / prev / play / next / repeat, volume slider and source line. |
| **PlayerBar** | Bottom bar: art 44, title/artist (ellipsis, 200px), centred controls + thin seek, timer chip (timer icon, "18:42", FOCUS label; opens focus mode), volume. Container queries: hide volume < 860px; hide seek, shuffle and repeat < 640px. Hidden when nothing plays and no timer runs. |
| **TaskList (Today)** | Card titled "Today" with "2 OF 5 DONE"; rows: checkbox, title (ellipsis), time (accent "NOW" for the current one), "+80 XP" (accent while open, muted when done; hidden with leveling off); last row "+ ADD A TASK" opens the command bar prefilled with "add ". |

---
## 10. Screens

Layout constants (desktop): sidebar 200px, top bar 76px (command bar), content padding 24px (Today: centred column max 1000px, padding 40/48px). Regions inside screens are split by hairlines; cards are used on Today, Music and widgets.

### 10.1 Awakening (onboarding, 6 steps, progress pips in the header)

1. **Welcome**: "Tell it what you did. It keeps score." + one paragraph + Begin.
2. **Questionnaire** (6 questions, one per screen, big option buttons): exercise days per week, average sleep, hours of focused study/work per day, creative practice per week, social time per week, how often plans get done. Each answer sets starting stat XP (table in `packages/app/src/onboarding/baselines.ts`, values 0-900 stat XP so starting values land between 5 and 35). Show the nine dense faders forming live under the question.
3. **Tone**: Strict / Neutral / Encouraging cards, each with the "deadline missed" sample from 6.8.
4. **Connect a model**: provider chips, API key (masked, saved to keychain on Test), model picker (filled from `listModels`), Test connection (shows "CONNECTED / 412 MS" or the error with its fix), "Skip. Use manual mode".
5. **Privacy**: three bullets (local storage and keychain; only your text goes to your chosen provider; sharing is off and opt-in) + Understood.
6. **First dailies**: 5 suggestions preselected by the questionnaire (checkboxes), editable, + Awaken. Then land on Today with a first System message "You awakened. Log anything to begin."

### 10.2 Today (home)

Exactly these, top to bottom:

- **Header row**: label "WEDNESDAY 14 OCTOBER", heading "Good afternoon, {name}." (morning before 12:00, afternoon until 17:00, evening after) Right: LevelChip (leveling on) or "2H 10M FOCUSED TODAY" (leveling off).
- **Two-column grid** (1fr / 1.1fr, 24px gap): left column ClockCard above MusicCard; right column TaskList.
- **One quiet link**: "Stats, quests and history are in the sidebar >" (leveling on only).

States: clock ready / running / paused / break; music playing / paused / nothing playing; no tasks ("Nothing planned. Add a task or log something." + Add); first day (only header, clock, music, and an empty task card with three suggested dailies). Clicking the clock opens TimerModal over a scrim. Do not add charts, feeds, faders or timelines to Today.

### 10.3 Status

Top: level numeral (numeral-xl) with RankBadge and title on the left; right column: XpRuler with "RANK C TRIAL UNLOCKS AT LEVEL 25. 2 LEVELS TO GO.", HpSegments, three key figures (day streak, on-time rate 30 days, XP today in accent). Then ATTRIBUTES: nine StatFaders in one row (click opens stat detail). Then two columns: Today's quests summary and the System feed (latest 7). Then XP per day (61-day XpStrip). Links row: Skills, System feed and Ask the System, Weekly report.

### 10.4 Command bar and Quick Log

Always reachable: top of the main window, the global hotkey (11.3), the widget input, the mobile centre tab. One input for logs, new tasks, reschedules and questions.

States to build: idle; voice dictation (hold or tap; live waveform; editable transcript; "ON-DEVICE" or provider label; Esc cancels); interpreting (entry already saved, sweep in the status strip); confirm card (one sentence, several items); plausibility flag; ambiguity prompt; daily auto-match; offline / no model (queued line + manual quick-pick: stat chips, minutes segmented 15/30/45/60/90, Log by hand); errors (bad key, provider down, rate limited), each with a FIX sentence and Retry / Open settings.

### 10.5 Quests

Tabs Today / This week / Main quests.

- Daily quests: checklist (QuestRow), done count, reset time, streak and progress dots.
- Tasks with deadlines: title, due, difficulty pips, stat codes, large countdown, RewardBadge with the live tier, Reschedule and Done. Overdue rows: danger-wash + LATE.
- Below or in a side column: reward-curve explainer (five tiers), ambition indicator examples, reschedule cost dialog ("First reschedule of this task: free. Next ones: -5% each."), emergency quest card (countdown, Accept / Decline, "Declining costs nothing"), rank trial card (7 day cells: done filled, current outlined accent, open), main quests (title, "7 of 11 sub-tasks", progress bar).
- Task sheet (route or side sheet): title, due date-time, reminders, difficulty segmented, stats trained, recurrence (for dailies: none, daily, weekdays, custom days), notes, Delete (danger), Cancel, Save.

### 10.6 Penalty Zone

Whole-app mode while active: the sidebar edge, top-bar rule and window border use `--danger`; a danger-wash banner under the top bar: "PENALTY ZONE / XP gain is halved until the recovery quest is complete." Status shows the recovery quest region first: both paths with progress (1 of 3 overdue tasks cleared; 0 of 60 focus minutes), a 24h countdown, and the HP-cap note if a penalty was reduced. Exit moment: card with ok border "PENALTY ZONE CLEARED / Recovery complete.", HP refilled to 30 animation, Continue. Motion: last HP segment drops (150ms), chrome rules fade to danger (200ms), banner slides 8px; on exit, segments refill left to right and the chrome fades back (250ms).

### 10.7 Rest days

Use-shield dialog: two shield icons, "2 shields left in October / resets on 1 November", explanation, Not today / Use shield. While active: rest banner, Status streak shows "FROZEN", dailies show a muted "Rest / frozen" badge and cannot fail.

### 10.8 The System (Status > System)

Feed (timestamped messages), the morning briefing card (date, HP, today's dailies and XP, deadlines, one suggested focus, Start the day / Dismiss; also sent as a notification at the first app open after 05:00 or at a set time), toasts and floating system windows (stat up, quest complete, deadline 2h and 30m, rank trial unlocked, HP low), actionable notifications (Mark done, Snooze, Reschedule), and Ask the System chat with suggested prompts.

### 10.9 Moments

- **Level up**: full window takeover; label LEVEL UP (accent), LevelRoll from old to new (size 280), then stat changes (+1 Intellect...), HP restored segments, new title if any, Continue. Timeline: content fades 150ms; label 150ms; roll at 250ms for 900ms; details at 900ms; Continue at 1100ms. Screen reader: "Level 24. Intellect +1, Focus +1, Discipline +1. HP restored."
- **Rank up**: larger; old rank badge (locked style), arrow, new rank badge growing from 0 (250ms after a 600ms beat), "You are now Rank C." and the trial summary.
- **Title earned**: small floating window (does not block), "Early Riser", how it was earned, Equip now / Later.

### 10.10 Stat detail

Back link, segmented 30 / 90 / 365 days. Left: code and name, value (140px numeral), stat level, today, 30-day change. Right: line chart of the value over the range (axis 0-100, gridlines 0/25/50/75/100). Below: top contributors (skill/activity name, % with bars) and recent entries that fed it (time, text, gains). Neglect banner when idle 5+ days with "Log a session".

### 10.11 Skills

Grouped under the stat they feed (a skill under two stats appears in both groups). Row: level, name, XP bar to next level, %, hours, last trained. Suggested skill banner at the top with Approve / Dismiss.

### 10.12 History

Tabs Log / Calendar / Titles. Log: filters (type All/Log/Task; stat chips), rows with time, type tag, text, gains, XP, edit, delete (delete asks to confirm and reverses its events). Calendar: month grid, each day shows XP (REST on shield days), selecting a day lists its entries below. Titles: grid of earned (ok badge) and locked (lock badge + how to earn).

### 10.13 Weekly report and share card

Report: five figures (XP this week in accent, best day, on-time rate, quests done, streak), stat gains as horizontal bars, the System's written review (template-driven summary + optional LLM-written paragraph if a model is connected) with one suggestion for next week, Export share card. Share card: fixed 1080x1350 layout (wordmark, week label, level numeral 300px, rank badge, title, three figures, top five stat gains bars, one summary line, "LOCAL-FIRST / OPEN SOURCE"); export PNG with `html-to-image` at 1x into the user's Pictures folder via the save dialog.

### 10.14 Music

Header "Music". Row: large NowPlaying (left) and Sources card (System media toggle with explanation; Music folder toggle with path; Play music when the timer starts toggle). Below: "From your music folder" grid of folders/albums (cover, name, track count); clicking plays it in the built-in player. States: nothing playing; app not sharing controls ("Some apps do not share playback with Windows. Use that app's own controls; the timer still works."); folder missing ("D:\Music is not available. It may be on a drive that is unplugged.").

### 10.15 Focus mode

Full window, no sidebar or command bar. Top: "FOCUS MODE / SESSION 2 OF 4" and "NEXT DEADLINE 18:00 / ESC TO EXIT". Centre: Dial 400px, WORKING ON + task title, "+38 XP SO FAR / TRAINS FOCUS / BREAK 10:00 NEXT", End session / Pause (80px) / +5 min. Bottom: mini player and Do not disturb toggle (suppresses toasts except deadline warnings). Break state: ok arc, "Stand up. Water. Look far away.", Skip break / Start session 3. Session complete notification: "Session complete / 50 minutes on Deep work. +60 XP, Focus +3. Break starts now." with Start break / +5 min / End.

### 10.16 Settings (sections in a left sub-list, content on the right)

Model (provider, API key masked with "Stored in the OS keychain", model, Test connection, token usage last 14 days bar strip); Voice (on-device vs provider, language, push-to-talk vs tap, download model button with size); System tone; Notifications per type + quiet hours (only deadline warnings break through); Stats (preset, rename, reorder, hide); Ruleset tuning (advanced; every constant from 5 with its default and Reset all); Music and focus (system media, music folder, play music with timer, lower music while dictating, focus and break length, leveling on/off); Widget (always on top, start with system, default size expanded/compact, opacity 60-100%); Data (export JSON/CSV, import JSON, delete all data with typed confirmation); Data sharing (13.3); Appearance (accent swatches, reduced motion, sound, haptics on mobile); Hotkey (record a shortcut); About (version, MIT license, source, docs, issues links).

### 10.17 Cross-screen states

Build each where relevant: empty (new user), loading/interpreting (never blocking), offline or no model, errors with a fix, Penalty Zone, rest day, leveling off, demo banner (web demo only: "DEMO DATA / Nothing here is saved." + Get the app).

---

## 11. Platform features

### 11.1 Music

**System media (default on, Windows):** Rust module `media.rs` using `windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager`:
- `RequestAsync()` once; subscribe to `CurrentSessionChanged`; for the current session subscribe to `MediaPropertiesChanged`, `PlaybackInfoChanged`, `TimelinePropertiesChanged`.
- Read `TryGetMediaPropertiesAsync()` (title, artist, album title, thumbnail stream -> read bytes -> data URL), `GetTimelineProperties()` (position, end time; interpolate position locally between updates), `GetPlaybackInfo()` (status, controls enabled) and `SourceAppUserModelId` (map to a friendly app name, e.g. Spotify, Chrome, Edge, VLC; fall back to the id).
- Commands: `TryTogglePlayPauseAsync`, `TrySkipNextAsync`, `TrySkipPreviousAsync`, `TryChangePlaybackPositionAsync` (only if `IsPlaybackPositionEnabled`). Disable buttons the session does not allow.
- Emit `music:changed` (throttle to 4/s). No volume control for other apps.
- Linux: `mpris` crate with the same shape. macOS: hide the System media option (no public API); music folder only.

**Music folder:** user picks a folder; Rust scans recursively for mp3, m4a, aac, flac, ogg, opus, wav with `lofty` (title, artist, album, duration, embedded cover saved to the app cache), stores `music_tracks`, watches for changes with `notify`. Playback uses an HTML `<audio>` element in a hidden always-alive webview (or the widget window) fed by `convertFileSrc`, with queue, next/previous, seek and volume. The built-in player also registers with system media controls where supported so the Windows media flyout shows it.

**Rules:** when both sources are on, the card shows whichever is playing; if both play, prefer the built-in player. "Play music when the timer starts": resumes the last system-media session or starts the music folder's last album. "Lower music while dictating": only the built-in player can be ducked (to 30%); for system media, pause on record start and resume on stop if it was playing (setting text explains this).

No Spotify Web API integration. (Spotify's developer quota rules make a shared login impossible for an open-source app; the Spotify desktop app is fully covered by system media.)

### 11.2 Focus timer

Implemented in Rust (`timer.rs`) as a state machine: `idle -> running -> paused -> running -> done | stopped`, then `break_running -> idle`. Ticks at 1 Hz, emits `timer:tick { kind, left_s, total_s, session, of, task_ref }`. On done: emit `timer:done`, play a short sound (setting), show a notification with actions, write the activity through the app service (5.7). Survives main-window close; widget and tray mirror it. Tray tooltip shows the remaining time.

### 11.3 Global hotkey

Default **Ctrl+Shift+Space** (Windows/Linux) and **Cmd+Shift+Space** (macOS). Do not use Ctrl+Space (switches input methods on Windows) or Cmd+Space (Spotlight on macOS). Configurable in Settings > Hotkey; detect registration failure and show "Shortcut in use by another app". The hotkey opens a small floating command window (560px wide, rounded lg, shadow) centred on the active display; Enter submits and the window closes; the confirm card appears there when interpretation finishes (or in the main window if it was closed).

### 11.4 Notifications

Types: deadline 2h and 30m (actionable: Mark done, Snooze 30m/10m, Reschedule), stat up and quest complete (toasts, no actions, auto-dismiss 5s), rank trial unlocked, HP low, morning briefing, session complete, title earned. Respect quiet hours (only deadline warnings marked critical pass) and per-type toggles. Clicking a notification opens the relevant route.

### 11.5 Desktop widgets (Windows first)

- **Companion widget (350x640)**: title row (ASCENDANT, open, pin, collapse); level row (ring, LEVEL 23 / RANK D, "660 TO GO +186 TODAY", HP 70) -> opens Status; timer row (116px dial with numerals only, working on, +XP so far, stop / pause / +5) -> dial opens focus mode; player (art 56, title, artist, source, thin seek, controls); next deadline with countdown and one quest; command bar input with mic.
- **Compact strip (560x76, the only full pill)**: level ring, timer (FOCUS label + numerals), track (art 40, title, artist), play/pause, next, expand.
- **Music widget (400x120, optional)**: art 88, title, artist, timer chip, thin seek, prev/play/next, open.
- **Taskbar thumbnail toolbar** on the main window (`ITaskbarList3::ThumbBarAddButtons` via the `windows` crate): previous, play/pause, next, start/pause timer.
- Settings: always on top (default on), start with system, default size, opacity.
- Leveling off: the level row becomes "FOCUSED TODAY 2H 10M".

### 11.6 Voice

Push-to-talk (hold mic or hotkey) or tap to toggle. On-device: capture 16 kHz mono in Rust (`cpal`), run `whisper-rs` with the downloaded model in a worker thread, stream partial text every ~1s to the transcript; final text replaces the partial. Provider: send the recorded WAV to the provider's transcription endpoint when supported (OpenAI-compatible `/audio/transcriptions`; otherwise fall back to on-device). Label shows ON-DEVICE or the provider name. Mic permission errors show a fix.

---

## 12. Settings, data and privacy

### 12.1 Keys and secrets
API keys only in the OS keychain (`keyring` service "ascendant", account = provider id). Settings stores only "has key: true". Logs redact anything that looks like a key.

### 12.2 Export / import / delete
Export JSON (full DB as versioned JSON with schema version) and CSV (activities, tasks, xp_events). Import JSON validates with Zod and runs migrations; conflicts by id keep the newer `updated_at`. Delete all data requires typing DELETE, removes the DB, keychain entries and caches, then restarts onboarding.

### 12.3 Data sharing (opt-in, off by default)
Levels: **Off** (nothing leaves the device); **Anonymous usage** (weekly counts: app version, OS, screens opened, features used; no text, no stats); **Interpretation feedback** (pairs of user text + model output + user correction, only for items the user edited). Feedback items go to `share_queue` first; a Review screen lists each item with Remove; nothing is sent until "Send reviewed items". "Delete previously shared data" sends a deletion request with the anonymous install id. Build the UI and queue now; the endpoint is a config value left empty until the project has a server (sending is a no-op with a visible "Sharing endpoint not configured" note).

---

## 13. Web demo and mobile

### 13.1 Web demo (`apps/web-demo`)
Same `packages/app` UI built with Vite for the browser. Adapters: DB on `sql.js` in memory seeded from `packages/seed`; LLM provider `demo` that returns canned interpretations for a list of example sentences and a generic fallback; no keychain, no voice download (browser Web Speech API if available, else disabled), music shows a demo track and disables system media. A `DEMO DATA` banner sits above everything. Deploy as a static site.

### 13.2 Mobile (phase 8)
Tauri 2 Android and iOS targets reusing `packages/app` with responsive layouts at 390x844: Today (greeting, level ring, clock card, mini player, next tasks), Quick Log voice capture (88px mic, waveform, editable transcript, Edit text / Send), Quests, History, Focus, Settings (list of sections). Bottom tab bar per 7.2. Home-screen widgets in native code reading a small JSON snapshot the app writes to a shared container: **small** (level, XP bar, daily progress dots) and **medium** (adds next deadline countdown and a mic shortcut that deep-links to voice capture). System media is not available on mobile; music card shows only the built-in player.

---

## 14. Seed data (`packages/seed`)

Generate a deterministic 60-day profile (seeded PRNG) by **running real events through the engine**, so all numbers are consistent:

- Profile "Alex" (public demo; the real name comes from onboarding), timezone Asia/Karachi, tone neutral, ends around level 23, rank D (C trial unlocks at 25), HP 70, streak 18, on-time rate about 87%, 2 shields available.
- Dailies: Read 20 pages (INT, 40), Train 30 minutes (END, 60), Deep work 90 minutes (FOC, 80), Plan tomorrow before 22:00 (DIS, 20), In bed before 23:30 (VIT, 30).
- Activities: runs (5-8 km), reading, deep work, guitar, UI design, TypeScript practice, calls; weekends lighter; two rest-shield days; three zero days.
- Tasks: past ones across all reward tiers including one failed; today: "Pay the hosting invoice" (09:00, in grace), "Send revised proposal" (18:00), "Finish the lab report" (late), "Call the dentist" (ambiguous time example).
- Titles earned: First Light, Early Riser. Skills: TypeScript, Reading, Deep work, Running, Guitar, UI design (with a pending "Stretching" suggestion).
- Music folder demo entries (fictional): "Weightless Hours" by Lumen Field (album Night Shift), "Low Tide Study" by Harbor & Pine, "Glass Corridor" by Mira Okon, "Paper Lanterns", "Signal Garden" by Teo Varga.

---
## 15. Build phases and acceptance criteria

Work strictly in order. Each phase is a PR-sized chunk; commit at the end of each with a clear message.

### Phase 0: Scaffold
- pnpm workspace, packages from section 3, TypeScript strict, ESLint + Prettier, Vitest, Playwright.
- Tauri 2 app in `apps/desktop` with the three windows declared (only `main` shown).
- `packages/ui`: tokens CSS (8.1-8.3), Tailwind preset mapping (`colors.bg = 'var(--bg)'` etc., `borderRadius.md = 'var(--radius-md)'`), fonts bundled and loaded with `font-display: swap`, base styles (`body` bg, text, font-stretch 112%, tabular numerals, focus ring, reduced-motion rule).

**Accept:** `pnpm dev` opens the main window with the sidebar and an empty Today; `pnpm test`, `lint`, `typecheck` pass; fonts load offline.

### Phase 1: Engine
- Implement section 5 in `packages/engine` with the ruleset object and tests for every rule and table boundary listed.
- `recalculate(ledger, ruleset)` replays events into profile/stat totals.

**Accept:** 100% line coverage on `packages/engine`; `docs/ruleset.md` generated.

### Phase 2: Database and seed
- Drizzle schema (4.1), migrations, repositories, services that call the engine and write events transactionally.
- Seed generator (14) using the engine; a dev menu item "Load demo profile".

**Accept:** seeded profile shows level 23ish, rank D, HP around 70, streak about 18; `recalculate` reproduces the cached totals exactly.

### Phase 3: Core UI and Today
- All primitives and domain components from 9 with the `/dev/components` kitchen sink showing every state.
- Today (10.2) wired to data (timer and music show static demo state for now), Status (10.3), Quests (10.5), History (10.12), Settings shell (10.16).
- Accent switcher and reduced-motion toggle work live.

**Accept:** visual check (15.9) passes; keyboard-only walkthrough of Today, Quests and Settings works; axe has no serious violations.

### Phase 4: Command bar and interpretation
- `packages/llm` providers, schemas, prompt, retries, error mapping; keychain commands; Settings > Model with Test connection and token usage.
- Command bar flow (6.1) with confirm card, plausibility, ambiguity, daily match, offline queue, manual quick-pick, all error states.
- Ask the System chat.

**Accept:** with a real key, "ran 5k this morning and submit the invoice by tomorrow at 7" yields a LOG and a TASK with a resolved due time and an am/pm question; with no network the entry queues and later interprets; an invalid key shows the bad-key fix; recorded fixtures make the tests pass offline.

### Phase 5: Timer and music
- Rust timer state machine (11.2), ClockCard + TimerModal + focus mode + notifications.
- System media module (11.1) and the music folder player; MusicCard, Music page, PlayerBar.

**Accept:** a 1-minute test session credits an activity and stat XP; play/pause/skip from the app controls the Spotify desktop app or a YouTube tab; the music folder plays, seeks and shows artwork; Today shows the correct playing app name.

### Phase 6: Desktop companion
- Widget and strip windows (11.5), tray, autostart, global hotkey (11.3) floating command window, taskbar thumbnail buttons, window-state persistence, open-main routing.

**Accept:** widget survives main-window close; collapse/expand keeps position; clicking level opens Status, dial opens focus mode; hotkey works from any app and reports conflicts.

### Phase 7: Progression moments and the rest
- Level up, rank up, title overlay (10.9), Penalty Zone (10.6), rest days (10.7), System feed templates and tones (6.8), morning briefing, stat detail, skills and suggestions, weekly report and share card export, onboarding (10.1), data export/import/delete, data sharing UI and queue (12.3), voice (11.6).

**Accept:** forcing HP to 0 in a test profile enters and exits the Penalty Zone through both recovery paths; level-up roll respects reduced motion; share card PNG is exactly 1080x1350.

### Phase 8: Web demo, macOS/Linux, mobile
- Web demo (13.1) deployed as static files; macOS and Linux builds (music folder only on macOS); Android/iOS targets and native home-screen widgets (13.2).

**Accept:** demo runs in a browser with the banner and canned interpretations; mobile screens render at 390x844 with 44px targets.

### 15.9 Visual check (run after every UI phase)
Playwright script `e2e/visual.spec.ts` that renders each screen and state at its design width (desktop 1280, widget 350x640, strip 560x76, mobile 390x844) and fails on: text overlapping other text or controls; text overflowing or clipped by its container (except deliberate ellipsis); round controls that are not square (mic, play, icon buttons); buttons shorter than 44px or with less than 8px horizontal padding around their label; labels wrapping inside buttons or segmented controls. Store screenshots as snapshots and review diffs.

---

## 16. `CLAUDE.md` template (create in phase 0)

```md
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
```

Also copy this whole specification into `docs/SPEC.md`.

---

## 17. Known risks and decisions to confirm

| Topic | Default in this spec | Why / what to check |
|---|---|---|
| Music provider | System media + music folder, no Spotify API | Spotify's developer mode allows only 5 users per app and extended quota is for large registered businesses, so a shared login is not possible for an open-source app. The Spotify desktop app is still controllable through system media. |
| macOS system media | Not supported (music folder only) | No public API for other apps' now-playing on macOS. |
| On-device voice | whisper.cpp model downloaded on demand | Model size (about 75-150 MB for small English models) must be shown before download. |
| Stat decay | On (1 point per day after 5 idle days) | Can feel punishing; it is a ruleset flag the user can turn off. |
| Level cap before rank trial | band start of next rank + 4 | Keeps trials meaningful without blocking progress for long. |
| Data sharing endpoint | Not configured | UI and queue ship; sending is a no-op until a server exists. |
| Demo identity | Seed name "Alex" for the public web demo | Use the real user's name only from onboarding. |

---

## 18. Glossary

- **Log**: something done; becomes an activity with XP and stat XP.
- **Task**: something to do with an optional deadline and reward tiers.
- **Daily (quest)**: a recurring checklist item that resets at local midnight.
- **Main quest**: a long-term goal made of tasks.
- **Emergency quest**: an optional, time-limited task generated by the System.
- **Rank trial**: a 7-day challenge that must be passed to change rank.
- **Penalty Zone**: the mode entered at 0 HP; XP is halved until recovery.
- **Shield**: a rest-day token (2 per month) that freezes dailies and the streak for a day.
- **The System**: the app's voice: feed messages, briefings, notifications and the chat.
- **Leveling off**: the mode that hides all RPG elements and keeps clock, music and tasks.
