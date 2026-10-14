import clsx from '../lib/clsx';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationProps {
  appLabel: string;
  tag: string;
  time: string;
  title: string;
  meta?: string;
  actions?: NotificationAction[];
  danger?: boolean;
  mobile?: boolean;
}

/** 360px floating card, radius lg, shadow; danger = danger border; mobile = full width, no shadow (spec 9.2). */
export function Notification({ appLabel, tag, time, title, meta, actions, danger = false, mobile = false }: NotificationProps) {
  return (
    <div
      role="alertdialog"
      className={clsx(
        'rounded-lg bg-bg border p-0 overflow-hidden',
        danger ? 'border-danger' : 'border-rule',
        mobile ? 'w-full' : 'w-[360px] shadow-window',
      )}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted">{appLabel}</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted border border-rule rounded-pill px-1.5">
            {tag}
          </span>
        </div>
        <span className="font-mono text-[10.5px] text-text-muted">{time}</span>
      </div>
      <div className="px-3 pt-2 pb-3 flex flex-col gap-1">
        <span className={clsx('font-display heading-m text-[16px] font-semibold', danger && 'text-danger')}>{title}</span>
        {meta && <span className="font-mono text-[11px] text-text-muted">{meta}</span>}
      </div>
      {actions && actions.length > 0 && (
        <div className="grid border-t border-rule" style={{ gridTemplateColumns: `repeat(${actions.length}, 1fr)` }}>
          {actions.map((action, i) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={clsx(
                'h-touch font-mono uppercase tracking-[.1em] text-[11px] transition-colors duration-base hover:bg-surface',
                i === 0 ? 'text-accent' : 'text-text',
                i > 0 && 'border-l border-rule',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
