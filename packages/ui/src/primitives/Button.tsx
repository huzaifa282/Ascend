import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from '../lib/clsx';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base =
  'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[.1em] ' +
  'whitespace-nowrap rounded-md border transition-colors transition-transform duration-base ' +
  'ease-out active:scale-[.98] flex-none disabled:opacity-40 disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  default: 'border-rule bg-transparent text-text hover:border-text',
  primary: 'border-accent bg-accent text-on-accent hover:bg-text hover:border-text',
  danger: 'border-danger bg-transparent text-danger hover:bg-danger-wash',
  ghost: 'border-transparent bg-transparent text-text-muted hover:text-text hover:bg-surface',
};

const sizes: Record<ButtonSize, string> = {
  md: 'h-touch min-h-touch px-4 text-[11px]',
  sm: 'h-touch min-h-touch px-3 text-[10.5px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'md', className, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={clsx(base, variants[variant], sizes[size], className)} {...rest} />
  );
});
