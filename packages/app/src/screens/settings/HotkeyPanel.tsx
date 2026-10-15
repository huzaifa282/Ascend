import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@ascendant/ui';
import { createServiceContext } from '../../services';
import { useHotkeySettings } from '../../hooks/useHotkeySettings';
import { formatAccelerator } from '../../lib/formatAccelerator';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function comboFromEvent(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  const key = e.key;
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(key)) return null;
  const keyName = key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;
  parts.push(keyName);
  return parts.length > 1 ? parts.join('+') : null;
}

/** Settings > Hotkey (spec 10.16, 11.3). Records a combo, then asks Rust to re-register it. */
export function HotkeyPanel() {
  const { data: hotkey } = useHotkeySettings();
  const queryClient = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (combo: string) => {
      const ctx = await createServiceContext();
      const row = await ctx.repos.settings.get();
      if (row) await ctx.repos.settings.update(row.id, { hotkey: { combo }, updatedAt: Date.now() });
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const ok = await invoke<boolean>('set_hotkey', { combo });
        if (!ok) throw new Error('Shortcut in use by another app');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hotkey'] }),
    onError: (e) => setError((e as Error).message),
  });

  const startRecording = useCallback(() => {
    setRecording(true);
    setError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = comboFromEvent(e);
      if (!combo) return;
      document.removeEventListener('keydown', onKeyDown);
      setRecording(false);
      save.mutate(combo);
    };
    document.addEventListener('keydown', onKeyDown);
  }, [save]);

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">Hotkey</h1>
      <p className="text-text-muted">Opens the quick-log command window from anywhere.</p>

      <div className="flex items-center gap-3">
        <kbd className="font-mono text-[13px] border border-rule rounded-md px-3 py-2">
          {recording ? 'Press a key combo…' : formatAccelerator(hotkey?.combo ?? 'CommandOrControl+Shift+Space')}
        </kbd>
        <Button variant="default" onClick={startRecording} disabled={recording || save.isPending}>
          {recording ? 'RECORDING…' : 'RECORD SHORTCUT'}
        </Button>
      </div>
      {error && <span className="font-mono text-[11px] text-danger">{error}</span>}
    </div>
  );
}
