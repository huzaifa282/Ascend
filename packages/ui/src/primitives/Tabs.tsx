import clsx from '../lib/clsx';

export interface TabItem<T extends string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
}

/** Mono uppercase; selected tab gets a 2px --text underline (spec 9.1). */
export function Tabs<T extends string>({ items, value, onChange, ...rest }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex items-center gap-6 border-b border-rule" {...rest}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={clsx(
              'h-touch min-h-touch -mb-px font-mono uppercase tracking-[.1em] text-[11px] whitespace-nowrap',
              'border-b-2 transition-colors duration-base',
              selected ? 'border-text text-text' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
