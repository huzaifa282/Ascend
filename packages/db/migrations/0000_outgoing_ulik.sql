CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`entry_item_id` text,
	`title` text NOT NULL,
	`skill_id` text,
	`started_at` integer NOT NULL,
	`duration_min` integer NOT NULL,
	`intensity` text NOT NULL,
	`distance_km` real,
	`stat_weights` text NOT NULL,
	`xp` integer NOT NULL,
	`multiplier` real DEFAULT 1 NOT NULL,
	`timer_session_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_timer_session_id_unique` ON `activities` (`timer_session_id`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`role` text NOT NULL,
	`text` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dailies` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`title` text NOT NULL,
	`stat_weights` text NOT NULL,
	`xp` integer NOT NULL,
	`recurrence` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`daily_id` text NOT NULL,
	`local_date` text NOT NULL,
	`completed_at` integer NOT NULL,
	`activity_id` text,
	FOREIGN KEY (`daily_id`) REFERENCES `dailies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`raw_text` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`model` text,
	`tokens_in` integer DEFAULT 0 NOT NULL,
	`tokens_out` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entry_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`entry_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`plausibility` text DEFAULT 'ok' NOT NULL,
	`resolved_xp` integer,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`at` integer NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`capped_from` integer,
	`ref_type` text,
	`ref_id` text
);
--> statement-breakpoint
CREATE TABLE `main_quests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`target_date` integer,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `music_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`path` text NOT NULL,
	`title` text NOT NULL,
	`artist` text,
	`album` text,
	`duration_s` real NOT NULL,
	`art_path` text,
	`folder` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `music_tracks_path_unique` ON `music_tracks` (`path`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`tone` text DEFAULT 'neutral' NOT NULL,
	`leveling_enabled` integer DEFAULT true NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`xp_into_level` integer DEFAULT 0 NOT NULL,
	`total_xp` integer DEFAULT 0 NOT NULL,
	`rank` text DEFAULT 'E' NOT NULL,
	`hp` integer DEFAULT 100 NOT NULL,
	`equipped_title_id` text,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`streak_frozen_until` integer,
	`penalty_zone_since` integer,
	`onboarding_done` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rank_trials` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`from_rank` text NOT NULL,
	`to_rank` text NOT NULL,
	`started_at` integer NOT NULL,
	`days` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`model` text NOT NULL,
	`voice` text NOT NULL,
	`notifications` text NOT NULL,
	`quiet_hours` text NOT NULL,
	`widget` text NOT NULL,
	`music` text NOT NULL,
	`timer` text NOT NULL,
	`appearance` text NOT NULL,
	`data_sharing` text NOT NULL,
	`ruleset_overrides` text,
	`hotkey` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `share_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`level` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer
);
--> statement-breakpoint
CREATE TABLE `shields` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`month` text NOT NULL,
	`used_on` text
);
--> statement-breakpoint
CREATE TABLE `skill_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`stat_codes` text NOT NULL,
	`evidence_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`stat_codes` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`last_trained_at` integer
);
--> statement-breakpoint
CREATE TABLE `stat_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`at` integer NOT NULL,
	`stat_code` text NOT NULL,
	`stat_xp` integer NOT NULL,
	`ref_type` text,
	`ref_id` text
);
--> statement-breakpoint
CREATE TABLE `stats` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`sort` integer NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`stat_xp` integer DEFAULT 0 NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`last_trained_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stats_code_unique` ON `stats` (`code`);--> statement-breakpoint
CREATE TABLE `system_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`at` integer NOT NULL,
	`kind` text NOT NULL,
	`template_key` text NOT NULL,
	`params` text NOT NULL,
	`read` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`due_at` integer,
	`window_start` integer NOT NULL,
	`difficulty` integer NOT NULL,
	`est_minutes` integer,
	`stat_weights` text NOT NULL,
	`reminder_minutes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` integer,
	`reward_tier` text,
	`xp_awarded` integer,
	`reschedule_count` integer DEFAULT 0 NOT NULL,
	`main_quest_id` text,
	`emergency` integer DEFAULT false NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE TABLE `timer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`kind` text NOT NULL,
	`planned_min` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`paused_ms` integer DEFAULT 0 NOT NULL,
	`task_id` text,
	`daily_id` text,
	`skill_id` text,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `titles` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`rule` text NOT NULL,
	`earned_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `titles_key_unique` ON `titles` (`key`);--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`at` integer NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`ref_type` text,
	`ref_id` text,
	`multiplier` real DEFAULT 1 NOT NULL
);
