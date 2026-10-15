import { useParams, useNavigate } from 'react-router-dom';
import { Toggle, clsx } from '@ascendant/ui';
import type { AccentTheme } from '../stores/useUiStore';
import { useUiStore } from '../stores/useUiStore';
import { ModelPanel } from './settings/ModelPanel';
import { MusicFocusPanel } from './settings/MusicFocusPanel';

const SECTIONS = [
  { id: 'model', label: 'Model' },
  { id: 'voice', label: 'Voice' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'stats', label: 'Stats' },
  { id: 'ruleset', label: 'Ruleset tuning' },
  { id: 'music', label: 'Music and focus' },
  { id: 'widget', label: 'Widget' },
  { id: 'data', label: 'Data' },
  { id: 'sharing', label: 'Data sharing' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'hotkey', label: 'Hotkey' },
  { id: 'about', label: 'About' },
] as const;

const ACCENTS: { id: AccentTheme; label: string }[] = [
  { id: 'azure', label: 'Azure' },
  { id: 'ember', label: 'Ember' },
  { id: 'acid', label: 'Acid' },
  { id: 'mono', label: 'Mono' },
];

/** Settings shell — spec 10.16. Appearance is fully functional; the rest deepen in phase 4/7. */
export function Settings() {
  const { section = 'model' } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { accent, reducedMotion, setAccent, setReducedMotion } = useUiStore();

  return (
    <div className="max-w-[1000px] mx-auto px-2 py-6 flex gap-8">
      <nav aria-label="Settings sections" className="w-48 flex-none flex flex-col gap-0.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate(`/settings/${s.id}`)}
            className={clsx(
              'h-touch px-3 text-left rounded-md font-display text-[14px] transition-colors duration-base',
              section === s.id ? 'bg-surface text-text' : 'text-text-muted hover:text-text hover:bg-surface',
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="flex-1">
        {section === 'model' ? (
          <ModelPanel />
        ) : section === 'music' ? (
          <MusicFocusPanel />
        ) : section === 'appearance' ? (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-[22px] font-bold a-heading">Appearance</h1>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">Accent</span>
              <div className="flex items-center gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccent(a.id)}
                    aria-pressed={accent === a.id}
                    aria-label={`${a.label} accent`}
                    className={clsx(
                      'w-touch h-touch rounded-pill border-2 transition-colors duration-base',
                      accent === a.id ? 'border-text' : 'border-transparent',
                    )}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <span
                      className="block w-6 h-6 rounded-pill mx-auto"
                      data-theme={a.id}
                      style={{ backgroundColor: 'var(--accent)' }}
                    />
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 cursor-pointer max-w-xs">
              <span className="font-display text-[14px]">Reduced motion</span>
              <Toggle checked={reducedMotion} onChange={setReducedMotion} aria-label="Reduced motion" />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[22px] font-bold a-heading">
              {SECTIONS.find((s) => s.id === section)?.label ?? section}
            </h1>
            <p className="text-text-muted">Built out further in a later phase.</p>
          </div>
        )}
      </div>
    </div>
  );
}
