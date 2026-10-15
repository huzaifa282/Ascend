function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Spec 10.13 — 1080x1350 share card PNG, saved via the OS save dialog into Pictures by default. */
export async function exportShareCardPng(node: HTMLElement): Promise<void> {
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(node, { width: 1080, height: 1350, pixelRatio: 1 });

  if (!isTauri()) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'ascendant-weekly-report.png';
    a.click();
    return;
  }

  const [{ save }, { writeFile }, { pictureDir }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
    import('@tauri-apps/api/path'),
  ]);
  const defaultPath = `${await pictureDir()}/ascendant-weekly-report.png`;
  const path = await save({ defaultPath, filters: [{ name: 'PNG', extensions: ['png'] }] });
  if (!path) return;

  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  await writeFile(path, bytes);
}
