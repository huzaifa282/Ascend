import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from '../lib/clsx';
import { Icon } from '../icons/Icon';
import type { IconKey } from '../icons/Icon';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconKey;
  'aria-label': string;
  size?: number;
  round?: boolean;
}

/** 44x44 icon button, radius md (or pill for the round variant) — spec 9.1. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 20, round = false, className, title, 'aria-label': ariaLabel, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={clsx(
        'inline-flex items-center justify-center w-touch h-touch min-w-touch min-h-touch flex-none',
        'text-text-muted hover:text-text hover:bg-surface transition-colors duration-base',
        round ? 'rounded-pill' : 'rounded-md',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
});
