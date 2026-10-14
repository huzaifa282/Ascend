import clsx from '../lib/clsx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
}

/** Rounded container, mono uppercase options; selected = --text fill / --bg text (spec 9.1). */
export function Segmented<T extends string>({ options, value, onChange, ...rest }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className="inline-flex items-center rounded-md bg-surface p-0.5 flex-nowrap"
      {...rest}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'h-touch min-h-touch px-3 rounded-sm font-mono uppercase tracking-[.1em] text-[10.5px] whitespace-nowrap',
              'transition-colors duration-base',
              selected ? 'bg-text text-bg' : 'text-text-muted hover:text-text',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
