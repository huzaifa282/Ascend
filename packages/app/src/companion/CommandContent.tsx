import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { IconButton } from '@ascendant/ui';
import { CommandBarContainer } from '../components/CommandBarContainer';

/**
 * The floating hotkey command window (560px wide, spec 11.3). Escape hides
 * it; the confirm card (when interpretation needs one) renders inline via
 * the same CommandBarContainer the main app's command bar uses.
 *
 * Decorations are off (frameless), so the drag region and close button
 * below are this window's *only* way to be moved or dismissed — without
 * them, a window shown unexpectedly (or kept open past the hotkey's own
 * trigger) has no discoverable way out beyond an undocumented Escape key.
 */
export function CommandContent() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void getCurrentWindow().hide();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-bg border border-rule rounded-lg overflow-hidden text-text">
      <div data-tauri-drag-region className="h-6 flex items-center justify-end px-2 flex-none cursor-move">
        <IconButton
          icon="x"
          aria-label="Close"
          size={14}
          onClick={() => void getCurrentWindow().hide()}
        />
      </div>
      <div className="flex-1 p-3 pt-0">
        <CommandBarContainer />
      </div>
    </div>
  );
}
