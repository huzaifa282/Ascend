import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';

/** Compact strip entry (spec 7.1, 11.5). Built out in phase 6. */
function StripPlaceholder() {
  return (
    <div className="h-screen w-screen rounded-pill border border-rule bg-bg text-text flex items-center justify-center">
      <span className="font-mono text-[10.5px] uppercase tracking-[.12em] text-text-muted">
        Strip — phase 6
      </span>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StripPlaceholder />
  </StrictMode>,
);
