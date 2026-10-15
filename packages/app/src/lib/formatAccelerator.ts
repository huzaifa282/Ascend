/** Formats a stored Tauri accelerator string (e.g. "CommandOrControl+Shift+Space") for display. */
export function formatAccelerator(combo: string): string {
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent);
  return combo
    .split('+')
    .map((part) => {
      if (part === 'CommandOrControl' || part === 'CmdOrCtrl') return isMac ? 'Cmd' : 'Ctrl';
      if (part === 'Command' || part === 'Cmd') return 'Cmd';
      if (part === 'Control' || part === 'Ctrl') return 'Ctrl';
      if (part.length <= 1) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('+');
}
