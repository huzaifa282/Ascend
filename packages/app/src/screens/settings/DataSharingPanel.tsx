import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Segmented } from '@ascendant/ui';
import { createServiceContext } from '../../services';
import { resolveRepos } from '../../hooks/useRepos';
import type { DataSharingSettings } from '../../settings/schema';

function useDataSharingSettings() {
  return useQuery({
    queryKey: ['dataSharing', 'settings'],
    queryFn: async () => {
      const repos = await resolveRepos();
      const row = await repos.settings.get();
      return (row?.dataSharing as DataSharingSettings | undefined) ?? null;
    },
  });
}

function useShareQueue() {
  return useQuery({
    queryKey: ['shareQueue'],
    queryFn: async () => (await resolveRepos()).shareQueue.listPending(),
  });
}

/** Settings > Data sharing (spec 12.3). Levels: Off / Anonymous usage / Interpretation feedback. */
export function DataSharingPanel() {
  const { data: sharing } = useDataSharingSettings();
  const { data: queue } = useShareQueue();
  const queryClient = useQueryClient();

  const patchLevel = useMutation({
    mutationFn: async (level: DataSharingSettings['level']) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (!row) return;
      await ctx.repos.settings.update(row.id, { dataSharing: { level }, updatedAt: Date.now() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dataSharing'] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const ctx = await createServiceContext();
      await ctx.repos.shareQueue.updateStatus(id, 'removed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shareQueue'] }),
  });

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">Data sharing</h1>
      <p className="text-text-muted">Opt-in, off by default. Nothing leaves this device unless you choose a level below.</p>

      <Segmented
        aria-label="Sharing level"
        value={sharing?.level ?? 'off'}
        onChange={(level) => patchLevel.mutate(level)}
        options={[
          { value: 'off', label: 'Off' },
          { value: 'anonymous', label: 'Anonymous usage' },
          { value: 'feedback', label: 'Interpretation feedback' },
        ]}
      />

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Review queue</span>
        <div className="rounded-lg border border-rule bg-bg a-card-clip">
          {(queue ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 a-row">
              <span className="font-mono text-[11px] text-text-muted truncate">{item.level} item</span>
              <Button variant="default" onClick={() => removeItem.mutate(item.id)}>
                REMOVE
              </Button>
            </div>
          ))}
          {(!queue || queue.length === 0) && <p className="text-text-muted p-4">Nothing queued.</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" disabled>
            SEND REVIEWED ITEMS
          </Button>
          <Button variant="default" disabled>
            DELETE PREVIOUSLY SHARED DATA
          </Button>
        </div>
        <span className="font-mono text-[11px] text-text-muted">Sharing endpoint not configured.</span>
      </div>
    </div>
  );
}
