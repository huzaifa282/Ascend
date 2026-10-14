import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';

/** Floating hotkey command window entry (spec 11.3). Built out in phase 6. */
function CommandPlaceholder() {
  return (
    <div className="h-screen w-screen rounded-lg border border-rule bg-bg text-text flex items-center justify-center">
      <span className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">
        Quick log — phase 6
      </span>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CommandPlaceholder />
  </StrictMode>,
);
