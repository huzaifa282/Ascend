import clsx from '../lib/clsx';
import { Icon } from '../icons/Icon';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
}

/** 44x44 hit area, 22px rounded-sm box; done = --text fill with --bg check (spec 9.1). */
export function Checkbox({ checked, onChange, disabled, ...rest }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'inline-flex items-center justify-center w-touch h-touch min-w-touch min-h-touch flex-none',
        disabled && 'opacity-40 pointer-events-none',
      )}
      {...rest}
    >
      <span
        className={clsx(
          'inline-flex items-center justify-center w-[22px] h-[22px] rounded-sm border transition-colors duration-base',
          checked ? 'bg-text border-text text-bg' : 'border-rule text-transparent',
        )}
      >
        {checked && <Icon name="check" size={14} />}
      </span>
    </button>
  );
}
