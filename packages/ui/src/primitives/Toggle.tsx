import clsx from '../lib/clsx';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
  id?: string;
}

/** 44x24 pill, 16px knob; on = accent border + knob (spec 9.1). role="switch". */
export function Toggle({ checked, onChange, disabled, id, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        // 44x24 is the spec's exact visual size; callers that place this
        // directly (not inside a label/row that already extends the hit
        // area) should wrap it to meet the 44px touch target (spec 8.5).
        'relative inline-flex items-center flex-none rounded-pill border transition-colors duration-base w-11 h-6',
        checked ? 'border-accent bg-transparent' : 'border-rule bg-transparent',
        disabled && 'opacity-40 pointer-events-none',
      )}
      {...rest}
    >
      <span
        className={clsx(
          'absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-pill transition-transform duration-base',
          checked ? 'bg-accent translate-x-[22px]' : 'bg-text-muted translate-x-[4px]',
        )}
      />
    </button>
  );
}
