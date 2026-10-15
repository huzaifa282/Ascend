import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Toggle } from '@ascendant/ui';
import { createServiceContext } from '../../services';
import { resolveRepos } from '../../hooks/useRepos';
import type { NotificationSettings, QuietHours } from '../../settings/schema';

const TYPE_LABELS: { key: keyof NotificationSettings; label: string }[] = [
  { key: 'deadlineWarnings', label: 'Deadline warnings' },
  { key: 'statUp', label: 'Stat up' },
  { key: 'questComplete', label: 'Quest complete' },
  { key: 'rankTrialUnlocked', label: 'Rank trial unlocked' },
  { key: 'hpLow', label: 'HP low' },
  { key: 'morningBriefing', label: 'Morning briefing' },
  { key: 'sessionComplete', label: 'Session complete' },
  { key: 'titleEarned', label: 'Title earned' },
];

function useNotificationSettings() {
  return useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const row = await repos.settings.get();
      return {
        notifications: (row?.notifications as NotificationSettings | undefined) ?? null,
        quietHours: (row?.quietHours as QuietHours | undefined) ?? null,
      };
    },
  });
}

/** Settings > Notifications (spec 10.16, 11.4). Per-type toggles + quiet hours. */
export function NotificationsPanel() {
  const { data } = useNotificationSettings();
  const queryClient = useQueryClient();

  const patchNotifications = useMutation({
    mutationFn: async (patch: Partial<NotificationSettings>) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (!row) return;
      const notifications = row.notifications as NotificationSettings;
      await ctx.repos.settings.update(row.id, { notifications: { ...notifications, ...patch }, updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const patchQuietHours = useMutation({
    mutationFn: async (patch: Partial<QuietHours>) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (!row) return;
      const quietHours = row.quietHours as QuietHours;
      await ctx.repos.settings.update(row.id, { quietHours: { ...quietHours, ...patch }, updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">Notifications</h1>

      <div className="flex flex-col gap-2">
        {TYPE_LABELS.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="font-display text-[14px]">{label}</span>
            <Toggle
              checked={data?.notifications?.[key] ?? true}
              onChange={(v) => patchNotifications.mutate({ [key]: v })}
              aria-label={label}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-2 border-t border-rule">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Quiet hours</span>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="font-display text-[14px]">Enabled</span>
          <Toggle
            checked={data?.quietHours?.enabled ?? false}
            onChange={(v) => patchQuietHours.mutate({ enabled: v })}
            aria-label="Quiet hours enabled"
          />
        </label>
        <p className="font-mono text-[11px] text-text-muted">Only deadline warnings marked critical break through.</p>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={data?.quietHours?.start ?? '22:00'}
            onChange={(e) => patchQuietHours.mutate({ start: e.target.value })}
            className="h-touch rounded-md border border-rule bg-surface px-3 font-mono text-[13px]"
          />
          <span className="text-text-muted">to</span>
          <input
            type="time"
            value={data?.quietHours?.end ?? '07:00'}
            onChange={(e) => patchQuietHours.mutate({ end: e.target.value })}
            className="h-touch rounded-md border border-rule bg-surface px-3 font-mono text-[13px]"
          />
        </div>
      </div>
    </div>
  );
}
