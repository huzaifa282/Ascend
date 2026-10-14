import type { SVGProps } from 'react';

/**
 * Inline SVG icon set — spec section 8.6.
 * 24px grid, 1.6px stroke, square caps, currentColor. Simple geometric paths only;
 * no third-party icon set with a recognisable style.
 */

// prettier-ignore
const PATHS: Record<IconKey, string> = {
  home:    'M4 11.5 12 4l8 7.5 M6.5 10V20h11V10',
  gauge:   'M12 12 16 8 M4 16a8 8 0 1 1 16 0 M4 16h16',
  list:    'M9 7h11 M9 12h11 M9 17h11 M4.5 7h.01 M4.5 12h.01 M4.5 17h.01',
  note:    'M6 3.5h9l3 3V20.5H6z M15 3.5V6.5h3 M9 11h6 M9 15h6',
  cal:     'M4.5 6.5h15v14h-15z M4.5 10h15 M8 3.5v5 M16 3.5v5',
  gear:    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2.1 2.1 M16.3 16.3l2.1 2.1 M18.4 5.6l-2.1 2.1 M7.7 16.3l-2.1 2.1',
  timer:   'M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z M12 9v4.5l3 2 M10 2.5h4',
  mic:     'M9 4.5h6v8a3 3 0 0 1-6 0z M6.5 11.5a5.5 5.5 0 0 0 11 0 M12 17v3.5 M9 20.5h6',
  check:   'M4.5 12.5 9.5 17.5 19.5 6.5',
  x:       'M6 6 18 18 M18 6 6 18',
  edit:    'M15.5 4.5 19.5 8.5 8 20H4v-4Z',
  plus:    'M12 5v14 M5 12h14',
  pin:     'M9 3.5h6l1 5-2.5 2.5V17l-2.5 3.5-2.5-3.5v-6L7.5 8.5z',
  expand:  'M9 4.5H4.5V9 M15 4.5h4.5V9 M9 19.5H4.5V15 M15 19.5h4.5V15',
  collapse:'M4.5 9V4.5H9 M15 4.5h4.5V9 M4.5 15v4.5H9 M15 19.5h4.5V15',
  warn:    'M12 4 21 19.5H3Z M12 10.5V15 M12 17.3h.01',
  shield:  'M12 3.5 19 6.5v6c0 5-3.2 7.5-7 9-3.8-1.5-7-4-7-9v-6Z',
  clock:   'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M12 8v4.5l3 2',
  enter:   'M8 7v4.5h9 M14 8.5l3 3-3 3 M6 16.5h.01',
  chat:    'M4.5 5.5h15v10h-7l-4 3.5v-3.5h-4Z',
  bolt:    'M13 3.5 6 13h5l-1 7.5 7-10h-5z',
  chev:    'M9 5.5 16 12l-7 6.5',
  lock:    'M7 10.5V8a5 5 0 0 1 10 0v2.5 M6 10.5h12v9H6z',
  share:   'M18 7.5a2.5 2.5 0 1 0-2.4-3.2 M18 19.5a2.5 2.5 0 1 0-2.4-3.2 M6 12a2.5 2.5 0 1 0 0 .01 M8.3 10.6l7.2-4 M8.3 13.4l7.2 4',
  trash:   'M5.5 7h13 M9.5 7V4.5h5V7 M7.5 7 8.3 20h7.4L16.5 7',
  rest:    'M15.5 4a8.5 8.5 0 1 0 4.5 15.6A8.5 8.5 0 0 1 15.5 4Z',
  stop:    'M6.5 6.5h11v11h-11z',
  prev:    'M16.5 5.5 8 12l8.5 6.5 M8 5.5v13',
  next:    'M7.5 5.5 16 12l-8.5 6.5 M16 5.5v13',
  play:    'M7.5 5v14l12-7Z',
  pause:   'M7.5 5.5h3v13h-3z M13.5 5.5h3v13h-3z',
  shuffle: 'M4.5 7h3.3L15 17h4.5 M4.5 17h3.3L12.3 11 M16.5 4.5 19.5 7l-3 2.5 M16.5 19.5l3-2.5-3-2.5',
  repeat:  'M6 8.5h12l-2.5-2.5 M18 15.5H6l2.5 2.5 M4.5 8.5V12a3 3 0 0 0 3 3 M19.5 15.5V12a3 3 0 0 0-3-3',
  heart:   'M12 20 5 13.3a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0l.5.5.5-.5a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5Z',
  vol:     'M4.5 9.5h3.5L13 5.5v13L8 14.5H4.5z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  ext:     'M9 6h-3.5v13h13V15.5 M13.5 5.5h5v5 M18 6l-8 8',
  folder:  'M4 6.5h6l2 2.5h8v9H4z',
  copy:    'M8.5 8.5h11v11h-11z M4.5 15.5v-11h11',
  speaker: 'M5 9.5h3.5L13 5.5v13L8.5 14.5H5z',
  queue:   'M4.5 6h11 M4.5 12h11 M4.5 18h7 M17 16l3 3-3 3 M17.5 19h3',
  search:  'M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z M15.5 15.5 20 20',
};

// Union of icon names (kept in sync with PATHS above).
export type IconKey =
  | 'home' | 'gauge' | 'list' | 'note' | 'cal' | 'gear' | 'timer' | 'mic' | 'check' | 'x'
  | 'edit' | 'plus' | 'pin' | 'expand' | 'collapse' | 'warn' | 'shield' | 'clock' | 'enter'
  | 'chat' | 'bolt' | 'chev' | 'lock' | 'share' | 'trash' | 'rest' | 'stop' | 'prev' | 'next'
  | 'play' | 'pause' | 'shuffle' | 'repeat' | 'heart' | 'vol' | 'ext' | 'folder' | 'copy'
  | 'speaker' | 'queue' | 'search';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconKey;
  size?: number;
  'aria-label'?: string;
}

export function Icon({ name, size = 24, 'aria-label': ariaLabel, ...rest }: IconProps) {
  const d = PATHS[name];
  const parts = d.split(/\s+(?=M)/).filter(Boolean);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      {...rest}
    >
      {name === 'play' || name === 'heart' ? (
        <path d={d} fill="currentColor" stroke="none" />
      ) : (
        parts.map((p, i) => <path key={i} d={p} />)
      )}
    </svg>
  );
}
