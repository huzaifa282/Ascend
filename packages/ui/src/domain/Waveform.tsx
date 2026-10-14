import clsx from '../lib/clsx';

export interface WaveformProps {
  active: boolean;
  className?: string;
}

/** 40 thin bars; active = accent animating 35-100% height with stagger; idle = flat muted (spec 9.2). */
export function Waveform({ active, className }: WaveformProps) {
  const bars = 40;
  return (
    <div className={clsx('flex items-center gap-0.5 h-8', className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={clsx('w-0.5 rounded-pill flex-none', active ? 'bg-accent a-wave-bar' : 'bg-text-muted')}
          style={
            active
              ? { animationDelay: `${(i % 8) * 60}ms`, height: '60%' }
              : { height: '20%' }
          }
        />
      ))}
    </div>
  );
}
