import clsx from '../lib/clsx';

export type SystemMessageKind = 'gain' | 'ok' | 'info' | 'danger';

export interface SystemMessageProps {
  kind: SystemMessageKind;
  time: string;
  text: string;
  isNew?: boolean;
}

const DOT: Record<SystemMessageKind, string> = {
  gain: 'bg-accent',
  ok: 'bg-ok',
  info: 'bg-text-muted',
  danger: 'bg-danger',
};

/** 6px status dot, 84px mono timestamp column, mono-body sentence; new = 600ms accent flash (spec 9.2). */
export function SystemMessage({ kind, time, text, isNew = false }: SystemMessageProps) {
  return (
    <div
      className={clsx('flex items-start gap-3 py-2 a-row', isNew && 'a-flash-accent')}
      aria-live="polite"
    >
      <span className={clsx('w-1.5 h-1.5 rounded-pill flex-none mt-1.5', DOT[kind])} />
      <span className="font-mono text-[11px] text-text-muted w-[84px] flex-none tabular-nums pt-px">{time}</span>
      <span className="font-mono text-[13px] leading-5 flex-1">{text}</span>
    </div>
  );
}
