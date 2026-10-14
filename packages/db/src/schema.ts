/**
 * Drizzle schema for every table in spec section 4.1.
 *
 * "All tables have `id TEXT PRIMARY KEY` (ULID), `created_at INTEGER` (ms
 * epoch), and `updated_at INTEGER`." — the `base` helper below adds those
 * three to every table; each table's own definition adds only the columns
 * the spec calls out for it.
 *
 * Event-ledger tables (`xp_events`, `stat_events`, `hp_events`) are
 * append-only: nothing in the service layer ever updates or deletes a row
 * in them. `profile` and `stats` cache derived totals that
 * `@ascendant/engine`'s `recalculate` can always reproduce by replaying the
 * ledger (Settings > "Recalculate from history").
 */
import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { StatCode } from '@ascendant/engine';

function base() {
  return {
    id: text('id').primaryKey(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  };
}

// ---------------------------------------------------------------------------
// Profile and settings (single row each)
// ---------------------------------------------------------------------------

export const profile = sqliteTable('profile', {
  ...base(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  tone: text('tone', { enum: ['strict', 'neutral', 'encouraging'] })
    .notNull()
    .default('neutral'),
  levelingEnabled: integer('leveling_enabled', { mode: 'boolean' }).notNull().default(true),
  level: integer('level').notNull().default(1),
  xpIntoLevel: integer('xp_into_level').notNull().default(0),
  totalXp: integer('total_xp').notNull().default(0),
  rank: text('rank', { enum: ['E', 'D', 'C', 'B', 'A', 'S'] })
    .notNull()
    .default('E'),
  hp: integer('hp').notNull().default(100),
  equippedTitleId: text('equipped_title_id'),
  streakDays: integer('streak_days').notNull().default(0),
  streakFrozenUntil: integer('streak_frozen_until'),
  penaltyZoneSince: integer('penalty_zone_since'),
  onboardingDone: integer('onboarding_done', { mode: 'boolean' }).notNull().default(false),
});

/** JSON column groups, validated by Zod schemas in `@ascendant/app`'s settings module. */
export const settings = sqliteTable('settings', {
  ...base(),
  model: text('model', { mode: 'json' }).notNull(),
  voice: text('voice', { mode: 'json' }).notNull(),
  notifications: text('notifications', { mode: 'json' }).notNull(),
  quietHours: text('quiet_hours', { mode: 'json' }).notNull(),
  widget: text('widget', { mode: 'json' }).notNull(),
  music: text('music', { mode: 'json' }).notNull(),
  timer: text('timer', { mode: 'json' }).notNull(),
  appearance: text('appearance', { mode: 'json' }).notNull(),
  dataSharing: text('data_sharing', { mode: 'json' }).notNull(),
  rulesetOverrides: text('ruleset_overrides', { mode: 'json' }),
  hotkey: text('hotkey', { mode: 'json' }).notNull(),
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export const stats = sqliteTable('stats', {
  ...base(),
  code: text('code').notNull().unique().$type<StatCode>(),
  name: text('name').notNull(),
  sort: integer('sort').notNull(),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  statXp: integer('stat_xp').notNull().default(0),
  value: integer('value').notNull().default(0),
  lastTrainedAt: integer('last_trained_at'),
});

// ---------------------------------------------------------------------------
// Entries (raw input) and entry items (the LLM's structured output)
// ---------------------------------------------------------------------------

export const entries = sqliteTable('entries', {
  ...base(),
  rawText: text('raw_text').notNull(),
  source: text('source', { enum: ['typed', 'voice', 'widget', 'manual'] }).notNull(),
  status: text('status', {
    enum: ['queued', 'interpreting', 'needs_confirm', 'confirmed', 'discarded', 'error'],
  }).notNull(),
  error: text('error'),
  model: text('model'),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
});

export const entryItems = sqliteTable('entry_items', {
  ...base(),
  entryId: text('entry_id')
    .notNull()
    .references(() => entries.id),
  kind: text('kind', {
    enum: ['log', 'task', 'reschedule', 'question', 'complete_task'],
  }).notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'removed'] }).notNull().default('pending'),
  plausibility: text('plausibility', { enum: ['ok', 'flagged', 'confirmed'] })
    .notNull()
    .default('ok'),
  resolvedXp: integer('resolved_xp'),
});

// ---------------------------------------------------------------------------
// Activities (logged, completed things that award XP)
// ---------------------------------------------------------------------------

export const activities = sqliteTable('activities', {
  ...base(),
  entryItemId: text('entry_item_id'),
  title: text('title').notNull(),
  skillId: text('skill_id'),
  startedAt: integer('started_at').notNull(),
  durationMin: integer('duration_min').notNull(),
  intensity: text('intensity', { enum: ['light', 'moderate', 'hard'] }).notNull(),
  distanceKm: real('distance_km'),
  statWeights: text('stat_weights', { mode: 'json' }).notNull().$type<Partial<Record<StatCode, number>>>(),
  xp: integer('xp').notNull(),
  multiplier: real('multiplier').notNull().default(1),
  timerSessionId: text('timer_session_id').unique(),
});

// ---------------------------------------------------------------------------
// Tasks with deadlines
// ---------------------------------------------------------------------------

export const tasks = sqliteTable('tasks', {
  ...base(),
  title: text('title').notNull(),
  notes: text('notes'),
  dueAt: integer('due_at'),
  windowStart: integer('window_start').notNull(),
  difficulty: integer('difficulty').notNull(),
  estMinutes: integer('est_minutes'),
  statWeights: text('stat_weights', { mode: 'json' }).notNull().$type<Partial<Record<StatCode, number>>>(),
  reminderMinutes: text('reminder_minutes', { mode: 'json' }).$type<number[]>(),
  status: text('status', { enum: ['open', 'done', 'failed', 'cancelled'] })
    .notNull()
    .default('open'),
  completedAt: integer('completed_at'),
  rewardTier: text('reward_tier'),
  xpAwarded: integer('xp_awarded'),
  rescheduleCount: integer('reschedule_count').notNull().default(0),
  mainQuestId: text('main_quest_id'),
  emergency: integer('emergency', { mode: 'boolean' }).notNull().default(false),
  expiresAt: integer('expires_at'),
});

// ---------------------------------------------------------------------------
// Dailies (recurring quests) and their per-day completions
// ---------------------------------------------------------------------------

export const dailies = sqliteTable('dailies', {
  ...base(),
  title: text('title').notNull(),
  statWeights: text('stat_weights', { mode: 'json' }).notNull().$type<Partial<Record<StatCode, number>>>(),
  xp: integer('xp').notNull(),
  /** rrule-lite: { type: 'daily' | 'weekdays' | 'custom', days?: number[] }. */
  recurrence: text('recurrence', { mode: 'json' }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

export const dailyCompletions = sqliteTable('daily_completions', {
  ...base(),
  dailyId: text('daily_id')
    .notNull()
    .references(() => dailies.id),
  localDate: text('local_date').notNull(),
  completedAt: integer('completed_at').notNull(),
  activityId: text('activity_id'),
});

// ---------------------------------------------------------------------------
// Main quests, skills and skill suggestions, titles
// ---------------------------------------------------------------------------

export const mainQuests = sqliteTable('main_quests', {
  ...base(),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: integer('target_date'),
  status: text('status', { enum: ['open', 'done', 'cancelled'] })
    .notNull()
    .default('open'),
});

export const skills = sqliteTable('skills', {
  ...base(),
  name: text('name').notNull(),
  statCodes: text('stat_codes', { mode: 'json' }).notNull().$type<StatCode[]>(),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  minutes: integer('minutes').notNull().default(0),
  lastTrainedAt: integer('last_trained_at'),
});

export const skillSuggestions = sqliteTable('skill_suggestions', {
  ...base(),
  name: text('name').notNull(),
  statCodes: text('stat_codes', { mode: 'json' }).notNull().$type<StatCode[]>(),
  evidenceCount: integer('evidence_count').notNull().default(0),
  status: text('status', { enum: ['open', 'approved', 'dismissed'] })
    .notNull()
    .default('open'),
});

export const titles = sqliteTable('titles', {
  ...base(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  rule: text('rule', { mode: 'json' }).notNull(),
  earnedAt: integer('earned_at'),
});

// ---------------------------------------------------------------------------
// Rank trials, timer sessions, rest-day shields
// ---------------------------------------------------------------------------

export const rankTrials = sqliteTable('rank_trials', {
  ...base(),
  fromRank: text('from_rank', { enum: ['E', 'D', 'C', 'B', 'A', 'S'] }).notNull(),
  toRank: text('to_rank', { enum: ['E', 'D', 'C', 'B', 'A', 'S'] }).notNull(),
  startedAt: integer('started_at').notNull(),
  days: text('days', { mode: 'json' })
    .notNull()
    .$type<Array<{ date: string; xp: number; dailiesDone: boolean; passed: boolean | null }>>(),
  status: text('status', { enum: ['active', 'passed'] })
    .notNull()
    .default('active'),
});

export const timerSessions = sqliteTable('timer_sessions', {
  ...base(),
  kind: text('kind', { enum: ['focus', 'break'] }).notNull(),
  plannedMin: integer('planned_min').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  pausedMs: integer('paused_ms').notNull().default(0),
  taskId: text('task_id'),
  dailyId: text('daily_id'),
  skillId: text('skill_id'),
  status: text('status', { enum: ['running', 'paused', 'done', 'stopped'] }).notNull(),
});

export const shields = sqliteTable('shields', {
  ...base(),
  month: text('month').notNull(),
  usedOn: text('used_on'),
});

// ---------------------------------------------------------------------------
// Event ledger (append-only — see module docblock)
// ---------------------------------------------------------------------------

export const xpEvents = sqliteTable('xp_events', {
  ...base(),
  at: integer('at').notNull(),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  refType: text('ref_type'),
  refId: text('ref_id'),
  multiplier: real('multiplier').notNull().default(1),
});

export const statEvents = sqliteTable('stat_events', {
  ...base(),
  at: integer('at').notNull(),
  statCode: text('stat_code').notNull().$type<StatCode>(),
  statXp: integer('stat_xp').notNull(),
  refType: text('ref_type'),
  refId: text('ref_id'),
});

export const hpEvents = sqliteTable('hp_events', {
  ...base(),
  at: integer('at').notNull(),
  delta: integer('delta').notNull(),
  reason: text('reason').notNull(),
  cappedFrom: integer('capped_from'),
  refType: text('ref_type'),
  refId: text('ref_id'),
});

// ---------------------------------------------------------------------------
// System feed, chat, music, sharing
// ---------------------------------------------------------------------------

export const systemMessages = sqliteTable('system_messages', {
  ...base(),
  at: integer('at').notNull(),
  kind: text('kind', { enum: ['gain', 'ok', 'info', 'danger'] }).notNull(),
  templateKey: text('template_key').notNull(),
  params: text('params', { mode: 'json' }).notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
});

export const chatMessages = sqliteTable('chat_messages', {
  ...base(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  text: text('text').notNull(),
  at: integer('at').notNull(),
});

export const musicTracks = sqliteTable('music_tracks', {
  ...base(),
  path: text('path').notNull().unique(),
  title: text('title').notNull(),
  artist: text('artist'),
  album: text('album'),
  durationS: real('duration_s').notNull(),
  artPath: text('art_path'),
  folder: text('folder').notNull(),
});

export const shareQueue = sqliteTable('share_queue', {
  ...base(),
  level: text('level', { enum: ['anonymous', 'feedback'] }).notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  status: text('status', { enum: ['pending', 'removed', 'sent'] })
    .notNull()
    .default('pending'),
  sentAt: integer('sent_at'),
});

/** Re-exported for migration generation convenience (`drizzle-kit`). */
export const schemaSqlNow = sql`(unixepoch('now') * 1000)`;
