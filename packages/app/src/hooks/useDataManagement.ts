import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceContext, deleteAllData, exportAllDataJson, exportLogCsv, importAllDataJson } from '../services';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function saveTextFile(contents: string, defaultName: string, mimeType: string): Promise<void> {
  if (!isTauri()) {
    const blob = new Blob([contents], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const [{ save }, { writeTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const path = await save({ defaultPath: defaultName });
  if (!path) return;
  await writeTextFile(path, contents);
}

export function useExportJson() {
  return useMutation({
    mutationFn: async () => {
      const ctx = await createServiceContext();
      const data = await exportAllDataJson(ctx);
      await saveTextFile(JSON.stringify(data, null, 2), 'ascendant-export.json', 'application/json');
    },
  });
}

export function useExportCsv() {
  return useMutation({
    mutationFn: async () => {
      const ctx = await createServiceContext();
      const csv = await exportLogCsv(ctx);
      await saveTextFile(csv, 'ascendant-log.csv', 'text/csv');
    },
  });
}

export function useImportJson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!isTauri()) throw new Error('Import is only available in the desktop app.');
      const [{ open }, { readTextFile }] = await Promise.all([
        import('@tauri-apps/plugin-dialog'),
        import('@tauri-apps/plugin-fs'),
      ]);
      const path = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (!path || typeof path !== 'string') return false;
      const text = await readTextFile(path);
      const ctx = await createServiceContext();
      await importAllDataJson(ctx, JSON.parse(text));
      return true;
    },
    onSuccess: (imported) => {
      if (imported) void queryClient.invalidateQueries();
    },
  });
}

export function useDeleteAllData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const ctx = await createServiceContext();
      await deleteAllData(ctx);
    },
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}
