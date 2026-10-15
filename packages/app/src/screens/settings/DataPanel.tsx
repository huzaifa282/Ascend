import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@ascendant/ui';
import { useDeleteAllData, useExportCsv, useExportJson, useImportJson } from '../../hooks';

/** Settings > Data (spec 10.16). */
export function DataPanel() {
  const navigate = useNavigate();
  const exportJson = useExportJson();
  const exportCsv = useExportCsv();
  const importJson = useImportJson();
  const deleteAll = useDeleteAllData();
  const [confirmText, setConfirmText] = useState('');
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    await deleteAll.mutateAsync();
    setDeleted(true);
    setTimeout(() => navigate('/onboarding/1'), 1200);
  };

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <h1 className="font-display text-[22px] font-bold a-heading">Data</h1>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Export</span>
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => exportJson.mutate()} disabled={exportJson.isPending}>
            EXPORT JSON
          </Button>
          <Button variant="default" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
            EXPORT LOG CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Import</span>
        <p className="text-text-muted">Replaces everything currently stored with the contents of a previously exported JSON file.</p>
        <Button variant="default" onClick={() => importJson.mutate()} disabled={importJson.isPending}>
          {importJson.isPending ? 'IMPORTING…' : 'IMPORT JSON'}
        </Button>
        {importJson.isError && <span className="font-mono text-[11px] text-danger">{(importJson.error as Error).message}</span>}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-danger p-4">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-danger">Delete all data</span>
        <p className="text-text-muted">This permanently erases everything — profile, stats, history, settings. Type DELETE to confirm.</p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="h-touch rounded-md border border-rule bg-surface px-3 font-mono text-[13px]"
        />
        <Button variant="danger" onClick={handleDelete} disabled={confirmText !== 'DELETE' || deleteAll.isPending || deleted}>
          {deleted ? 'DELETED' : deleteAll.isPending ? 'DELETING…' : 'DELETE EVERYTHING'}
        </Button>
      </div>
    </div>
  );
}
