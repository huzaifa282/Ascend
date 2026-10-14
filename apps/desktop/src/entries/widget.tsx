import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';

/**
 * Companion widget entry (spec 7.1, 9.5/11.5). Deliberately a separate, light
 * bundle: no router, no LLM pipeline, no TanStack Query provider tree — just
 * the widget surface. Built out in phase 6.
 */
function WidgetPlaceholder() {
  return (
    <div className="h-screen w-screen rounded-lg border border-rule bg-bg text-text flex items-center justify-center">
      <span className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">
        Widget — phase 6
      </span>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WidgetPlaceholder />
  </StrictMode>,
);
