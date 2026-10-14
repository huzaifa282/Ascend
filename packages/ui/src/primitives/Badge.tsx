import type { ReactNode } from 'react';
import clsx from '../lib/clsx';

export type BadgeTone = 'ok' | 'mid' | 'danger' | 'danger-fill' | 'muted';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  ok: 'border border-ok text-ok',
  mid: 'border border-rule text-text',
  danger: 'border border-danger text-danger',
  'danger-fill': 'bg-danger text-on-accent border border-danger',
  muted: 'border border-rule text-text-muted',
};

/** Pill, mono uppercase 10.5px; tones ok/mid/danger/danger-fill/muted (spec 9.1). */
export function Badge({ tone = 'mid', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center h-5 px-2 rounded-pill font-mono uppercase tracking-[.1em] text-[10.5px] whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
