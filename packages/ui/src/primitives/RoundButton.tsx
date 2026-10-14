import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from '../lib/clsx';
import { Icon } from '../icons/Icon';
import type { IconKey } from '../icons/Icon';

export interface RoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconKey;
  'aria-label': string;
  size?: number;
}

/** `.a-cbtn` — 44x44 circle, text-muted, hover surface fill (spec 9.1). */
export const RoundButton = forwardRef<HTMLButtonElement, RoundButtonProps>(function RoundButton(
  { icon, size = 20, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'a-cbtn inline-flex items-center justify-center w-touch h-touch min-w-touch min-h-touch flex-none rounded-pill',
        'text-text-muted hover:text-text hover:bg-surface transition-colors duration-base',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  );
});
