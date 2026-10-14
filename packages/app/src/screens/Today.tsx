import { useProfileStore } from '../stores/useProfileStore';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });

/**
 * Today (home) — spec 10.2. Phase 0 ships the header row and the empty-task
 * state only; ClockCard, MusicCard and TaskList are built in phases 3 and 5.
 */
export function Today() {
  const name = useProfileStore((s) => s.name);
  const now = new Date();
  const label = `${WEEKDAY_FORMAT.format(now).toUpperCase()} ${DATE_FORMAT.format(now).toUpperCase()}`;

  return (
    <div className="max-w-[1000px] mx-auto px-10 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted mb-1">
            {label}
          </p>
          <h1 className="font-display text-[28px] leading-8 font-bold a-heading">
            {greetingFor(now.getHours())}, {name}.
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.1fr] gap-6">
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-rule bg-bg p-4 h-[180px] flex items-center justify-center">
            <span className="text-text-muted font-mono text-[11px] uppercase tracking-[.12em]">
              Clock — phase 5
            </span>
          </div>
          <div className="rounded-lg border border-rule bg-bg p-4 h-[88px] flex items-center justify-center">
            <span className="text-text-muted font-mono text-[11px] uppercase tracking-[.12em]">
              Music — phase 5
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-rule bg-bg overflow-hidden">
          <div className="h-[56px] flex items-center px-4 border-b border-rule">
            <h2 className="font-display text-[18px] font-semibold a-heading">Today</h2>
          </div>
          <div className="p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[140px]">
            <p className="text-text-muted">Nothing planned. Add a task or log something.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
