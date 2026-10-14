import clsx from '../lib/clsx';

export interface LevelRollProps {
  from: number;
  to: number;
  size?: number;
  className?: string;
}

/**
 * Each digit is a vertical strip of 0-9 (twice, so it can roll past 9->0),
 * animated with translateY in em units (spec 9.2, 10.9's 900ms roll).
 */
export function LevelRoll({ from, to, size = 160, className }: LevelRollProps) {
  const digits = String(to).padStart(String(from).length, '0').split('');
  const fromDigits = String(from).padStart(digits.length, '0').split('');

  return (
    <div
      className={clsx('flex a-numeral font-display font-extrabold', className)}
      style={{ fontSize: size, lineHeight: 1 }}
      role="img"
      aria-label={`Level ${to}`}
    >
      {digits.map((d, i) => (
        <Digit key={i} from={Number(fromDigits[i] ?? d)} to={Number(d)} />
      ))}
    </div>
  );
}

function Digit({ from, to }: { from: number; to: number }) {
  // Two 0-9 runs back to back so an upward roll (e.g. 9 -> 0) can continue
  // downward through the strip rather than jumping backward.
  const strip = [...Array(10).keys(), ...Array(10).keys()];
  const targetIndex = to >= from ? 10 + to : 10 + to; // always land on the second run
  const offset = targetIndex;

  return (
    <span className="relative overflow-hidden" style={{ height: '1em', width: '0.68em' }}>
      <span
        className="absolute left-0 top-0 flex flex-col transition-transform ease-[cubic-bezier(.2,.8,.2,1)] duration-[var(--motion-level-roll)]"
        style={{ transform: `translateY(-${offset}em)` }}
      >
        {strip.map((n, i) => (
          <span key={i} style={{ height: '1em' }}>
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}
