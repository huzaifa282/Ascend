import clsx from '../lib/clsx';

export type TypeTagKind = 'log' | 'task';

export interface TypeTagProps {
  kind: TypeTagKind;
  className?: string;
}

/** LOG (outlined) / TASK (filled --text), radius sm (spec 9.1). */
export function TypeTag({ kind, className }: TypeTagProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center h-5 px-1.5 rounded-sm font-mono uppercase tracking-[.1em] text-[10.5px]',
        kind === 'task' ? 'bg-text text-bg' : 'border border-rule text-text-muted',
        className,
      )}
    >
      {kind === 'task' ? 'TASK' : 'LOG'}
    </span>
  );
}
