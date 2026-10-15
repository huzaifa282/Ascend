/**
 * Zod schemas for the `settings` table's JSON columns (spec 4.1, 10.16).
 * Validated on read and write so a malformed import or a future migration
 * never silently corrupts Settings.
 */
import { z } from 'zod';
import type { DeepPartial, Ruleset } from '@ascendant/engine';

export const ModelProviderSchema = z.enum([
  'openai',
  'anthropic',
  'gemini',
  'openrouter',
  'ollama',
  'lmstudio',
]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

export const ModelTestResultSchema = z.object({
  ok: z.boolean(),
  latencyMs: z.number(),
  error: z.string().nullable(),
  testedAt: z.number(),
});
export type ModelTestResultRecord = z.infer<typeof ModelTestResultSchema>;

export const ModelSettingsSchema = z.object({
  provider: ModelProviderSchema.nullable(),
  model: z.string().nullable(),
  /** The key itself lives only in the OS keychain (spec 12.1) — never here. */
  hasKey: z.boolean(),
  /** So Settings > Model can show the last Test connection result after a remount. */
  lastTestResult: ModelTestResultSchema.nullable().default(null),
});
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: null,
  model: null,
  hasKey: false,
  lastTestResult: null,
};

// Voice capture is deferred in this build (docs/decisions.md); the schema
// still exists so Settings > Voice has something to render, inert.
export const VoiceSettingsSchema = z.object({
  mode: z.enum(['on_device', 'provider', 'disabled']),
  language: z.string(),
  pushToTalk: z.boolean(),
});
export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  mode: 'disabled',
  language: 'en',
  pushToTalk: true,
};

export const NotificationSettingsSchema = z.object({
  deadlineWarnings: z.boolean(),
  statUp: z.boolean(),
  questComplete: z.boolean(),
  rankTrialUnlocked: z.boolean(),
  hpLow: z.boolean(),
  morningBriefing: z.boolean(),
  sessionComplete: z.boolean(),
  titleEarned: z.boolean(),
});
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  deadlineWarnings: true,
  statUp: true,
  questComplete: true,
  rankTrialUnlocked: true,
  hpLow: true,
  morningBriefing: true,
  sessionComplete: true,
  titleEarned: true,
};

export const QuietHoursSchema = z.object({
  enabled: z.boolean(),
  /** "HH:MM" local time. Only deadline warnings (marked critical) break through. */
  start: z.string(),
  end: z.string(),
});
export type QuietHours = z.infer<typeof QuietHoursSchema>;
export const DEFAULT_QUIET_HOURS: QuietHours = { enabled: false, start: '22:00', end: '07:00' };

export const WidgetSettingsSchema = z.object({
  alwaysOnTop: z.boolean(),
  startWithSystem: z.boolean(),
  defaultSize: z.enum(['expanded', 'compact']),
  opacity: z.number().min(60).max(100),
});
export type WidgetSettings = z.infer<typeof WidgetSettingsSchema>;
export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  // Off by default: the companion sits anchored to the desktop (behind every
  // other window), not floating on top of everything — see
  // commands/desktop_anchor.rs and docs/decisions.md.
  alwaysOnTop: false,
  startWithSystem: false,
  defaultSize: 'expanded',
  opacity: 100,
};

export const MusicSettingsSchema = z.object({
  systemMediaEnabled: z.boolean(),
  musicFolderPath: z.string().nullable(),
  playMusicWithTimer: z.boolean(),
  lowerMusicWhileDictating: z.boolean(),
});
export type MusicSettings = z.infer<typeof MusicSettingsSchema>;
export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  systemMediaEnabled: true,
  musicFolderPath: null,
  playMusicWithTimer: false,
  lowerMusicWhileDictating: true,
};

export const TimerSettingsSchema = z.object({
  defaultFocusMinutes: z.number().int().min(5).max(180),
  defaultBreakMinutes: z.number().int().min(5).max(15),
  soundAtEnd: z.boolean(),
  autoStartBreaks: z.boolean(),
  levelingEnabled: z.boolean(),
});
export type TimerSettings = z.infer<typeof TimerSettingsSchema>;
export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  defaultFocusMinutes: 25,
  defaultBreakMinutes: 5,
  soundAtEnd: true,
  autoStartBreaks: false,
  levelingEnabled: true,
};

export const AccentThemeSchema = z.enum(['azure', 'ember', 'acid', 'mono']);
export const AppearanceSettingsSchema = z.object({
  accent: AccentThemeSchema,
  reducedMotion: z.boolean(),
  sound: z.boolean(),
  haptics: z.boolean(),
});
export type AppearanceSettings = z.infer<typeof AppearanceSettingsSchema>;
export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  accent: 'azure',
  reducedMotion: false,
  sound: true,
  haptics: true,
};

export const DataSharingSettingsSchema = z.object({
  level: z.enum(['off', 'anonymous', 'feedback']),
});
export type DataSharingSettings = z.infer<typeof DataSharingSettingsSchema>;
export const DEFAULT_DATA_SHARING_SETTINGS: DataSharingSettings = { level: 'off' };

export const HotkeySettingsSchema = z.object({
  /** e.g. "CommandOrControl+Shift+Space" (spec 11.3's cross-platform default). */
  combo: z.string(),
});
export type HotkeySettings = z.infer<typeof HotkeySettingsSchema>;
export const DEFAULT_HOTKEY_SETTINGS: HotkeySettings = { combo: 'CommandOrControl+Shift+Space' };

/** Ruleset overrides are a deep-partial of the engine's Ruleset (nullable column). */
export type RulesetOverrides = DeepPartial<Ruleset>;

export const SettingsSchema = z.object({
  model: ModelSettingsSchema,
  voice: VoiceSettingsSchema,
  notifications: NotificationSettingsSchema,
  quietHours: QuietHoursSchema,
  widget: WidgetSettingsSchema,
  music: MusicSettingsSchema,
  timer: TimerSettingsSchema,
  appearance: AppearanceSettingsSchema,
  dataSharing: DataSharingSettingsSchema,
  hotkey: HotkeySettingsSchema,
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  model: DEFAULT_MODEL_SETTINGS,
  voice: DEFAULT_VOICE_SETTINGS,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  quietHours: DEFAULT_QUIET_HOURS,
  widget: DEFAULT_WIDGET_SETTINGS,
  music: DEFAULT_MUSIC_SETTINGS,
  timer: DEFAULT_TIMER_SETTINGS,
  appearance: DEFAULT_APPEARANCE_SETTINGS,
  dataSharing: DEFAULT_DATA_SHARING_SETTINGS,
  hotkey: DEFAULT_HOTKEY_SETTINGS,
};
