import { convertFileSrc } from '@tauri-apps/api/core';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Turns an absolute filesystem path (cover art, music files) into a webview-loadable URL. */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return isTauri() ? convertFileSrc(path) : undefined;
}
