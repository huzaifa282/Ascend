/** Spec 5.5 — rescheduling a task (the reward multiplier itself is applied at completion). */
import { windowStartAfterReschedule } from '@ascendant/engine';
import type { ServiceContext } from './context';

export async function rescheduleTask(
  ctx: ServiceContext,
  taskId: string,
  newDueAt: number,
  now: number,
): Promise<void> {
  const task = await ctx.repos.tasks.getById(taskId);
  if (!task) throw new Error(`rescheduleTask: task ${taskId} not found`);

  const oldDueAt = task.dueAt ?? now;
  const newWindowStart = windowStartAfterReschedule(task.windowStart, oldDueAt, newDueAt, now);

  await ctx.repos.tasks.update(taskId, {
    dueAt: newDueAt,
    windowStart: newWindowStart,
    rescheduleCount: task.rescheduleCount + 1,
    updatedAt: now,
  });
}
