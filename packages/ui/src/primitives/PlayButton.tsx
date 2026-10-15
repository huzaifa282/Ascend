import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from '../lib/clsx';
import { Icon } from '../icons/Icon';

export type PlayButtonSize = 'small' | 'md' | 'large' | 'xl';

export interface PlayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  playing: boolean;
  size?: PlayButtonSize;
  'aria-label': string;
}

const SIZES: Record<PlayButtonSize, { box: number; icon: number }> = {
  small: { box: 44, icon: 18 },
  md: { box: 52, icon: 20 },
  large: { box: 64, icon: 26 },
  xl: { box: 80, icon: 32 },
};

/** --text fill, --bg icon, hover accent. Sizes 44/52/64/80 (spec 9.1). */
export const PlayButton = forwardRef<HTMLButtonElement, PlayButtonProps>(function PlayButton(
  { playing, size = 'md', className, style, title, 'aria-label': ariaLabel, ...rest },
  ref,
) {
  const { box, icon } = SIZES[size];
  return (
    <button
      ref={ref}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={clsx(
        'inline-flex items-center justify-center flex-none rounded-pill',
        'bg-text text-bg hover:bg-accent transition-colors duration-base active:scale-[.98]',
        className,
      )}
      style={{ width: box, height: box, minWidth: box, minHeight: box, ...style }}
      {...rest}
    >
      <Icon name={playing ? 'pause' : 'play'} size={icon} />
    </button>
  );
});
