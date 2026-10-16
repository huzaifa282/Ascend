/** Spec 6.2 — the LLM's structured output schema. It never outputs XP, HP, levels or rewards. */
import { z } from 'zod';
import type { ActivityType as EngineActivityType } from '@ascendant/engine';

export const StatCodeSchema = z.enum(['STR', 'END', 'AGI', 'VIT', 'INT', 'FOC', 'CRE', 'CHA', 'DIS']);
export const WeightsSchema = z
  .array(z.object({ code: StatCodeSchema, weight: z.number().min(0.05).max(1) }))
  .min(1)
  .max(3);

// Kept in sync with engine's `ActivityType` by the compile-time check near
// the bottom of this file — llm imports only engine *types*, not its values,
// so the list is duplicated here rather than imported.
export const ActivityTypeSchema = z.enum([
  'cardio',
  'strength',
  'sport',
  'mobility',
  'deep_work',
  'learning',
  'reading',
  'creative',
  'mindfulness',
  'social',
  'chores',
  'other',
]);

export const LogItemSchema = z.object({
  kind: z.literal('log'),
  summary: z.string().max(80),
  activity_class: z.string().max(40),
  activity_type: ActivityTypeSchema.nullable(),
  skill: z.string().max(40).nullable(),
  duration_min: z.number().int().min(1).max(960).nullable(),
  intensity: z.enum(['light', 'moderate', 'hard']),
  distance_km: z.number().positive().nullable(),
  pages: z.number().int().positive().nullable(),
  started_text: z.string().nullable(),
  stats: WeightsSchema,
  matches_daily_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const TaskItemSchema = z.object({
  kind: z.literal('task'),
  title: z.string().max(80),
  due_text: z.string().nullable(),
  difficulty: z.number().int().min(1).max(5),
  est_minutes: z.number().int().positive().nullable(),
  stats: WeightsSchema,
  reminder_minutes: z.array(z.number().int().positive()).max(3).nullable(),
});

export const RescheduleItemSchema = z.object({
  kind: z.literal('reschedule'),
  task_id: z.string(),
  due_text: z.string(),
});

export const CompleteItemSchema = z.object({
  kind: z.literal('complete_task'),
  task_id: z.string(),
});

export const QuestionItemSchema = z.object({
  kind: z.literal('question'),
  intent: z.enum(['left_today', 'xp_today', 'next_deadline', 'stat_status', 'other']),
  text: z.string(),
});

export const InterpretationSchema = z.object({
  items: z
    .array(
      z.discriminatedUnion('kind', [
        LogItemSchema,
        TaskItemSchema,
        RescheduleItemSchema,
        CompleteItemSchema,
        QuestionItemSchema,
      ]),
    )
    .min(1)
    .max(6),
});

export type StatCode = z.infer<typeof StatCodeSchema>;
export type Weights = z.infer<typeof WeightsSchema>;
export type ActivityTypeAnswer = z.infer<typeof ActivityTypeSchema>;
export type LogItem = z.infer<typeof LogItemSchema>;
export type TaskItem = z.infer<typeof TaskItemSchema>;
export type RescheduleItem = z.infer<typeof RescheduleItemSchema>;
export type CompleteItem = z.infer<typeof CompleteItemSchema>;
export type QuestionItem = z.infer<typeof QuestionItemSchema>;
export type InterpretationItem = LogItem | TaskItem | RescheduleItem | CompleteItem | QuestionItem;
export type Interpretation = z.infer<typeof InterpretationSchema>;

// Compile-time check that ActivityTypeSchema's enum exactly matches engine's
// ActivityType — if engine adds, removes or renames a type, this line fails
// to compile until the enum list above is updated to match.
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _activityTypeInSync: AssertExact<ActivityTypeAnswer, EngineActivityType> = true;
void _activityTypeInSync;

/**
 * Spec 6.5 — what a duration follow-up answer resolves to. The model is only
 * ever asked to pull a duration out of the person's own words (never invent
 * one); `started_text` carries a verbatim time/range phrase for the caller's
 * deterministic chrono-node resolution, same as `LogItem.started_text`.
 */
export const DurationAnswerSchema = z.object({
  duration_min: z.number().int().min(1).max(960).nullable(),
  started_text: z.string().nullable(),
});
export type DurationAnswer = z.infer<typeof DurationAnswerSchema>;
