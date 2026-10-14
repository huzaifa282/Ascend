import type { ReactNode } from 'react';
import clsx from '../lib/clsx';

export interface CardProps {
  title?: string;
  /** Mono uppercase label instead of a heading (e.g. "61 DAYS AGO"). */
  label?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** --bg fill, 1px --rule, radius lg, overflow hidden; 48-56px header (spec 9.1). */
export function Card({ title, label, right, children, className }: CardProps) {
  const hasHeader = Boolean(title || label || right);
  return (
    <div className={clsx('a-card-clip rounded-lg border border-rule bg-bg', className)}>
      {hasHeader && (
        <div className="h-[52px] flex items-center justify-between px-4 border-b border-rule">
          {title && <h2 className="font-display heading-m text-[18px] leading-6 font-semibold a-heading">{title}</h2>}
          {label && (
            <span className="font-mono text-[11px] uppercase tracking-[.12em] text-text-muted">{label}</span>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
