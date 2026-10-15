import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CommandBarContainer } from '../components/CommandBarContainer';

/**
 * The floating hotkey command window (560px wide, spec 11.3). Escape hides
 * it; the confirm card (when interpretation needs one) renders inline via
 * the same CommandBarContainer the main app's command bar uses.
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
    <div className="h-screen w-screen p-3 bg-bg border border-rule rounded-lg overflow-hidden text-text">
      <CommandBarContainer />
    </div>
  );
}
