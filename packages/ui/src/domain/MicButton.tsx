import clsx from '../lib/clsx';
import { Icon } from '../icons/Icon';

export interface MicButtonProps {
  recording: boolean;
  onClick?: () => void;
  mobile?: boolean;
  disabled?: boolean;
  title?: string;
}

/** Mic round 44 (88 mobile capture); recording = accent fill + stop icon, aria-pressed (spec 9.2). */
export function MicButton({ recording, onClick, mobile = false, disabled = false, title }: MicButtonProps) {
  const size = mobile ? 88 : 44;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={recording}
      aria-label={recording ? 'Stop recording' : 'Start voice input'}
      className={clsx(
        'inline-flex items-center justify-center rounded-pill flex-none transition-colors duration-base',
        recording ? 'bg-accent text-on-accent' : 'text-text-muted hover:text-text hover:bg-surface',
        disabled && 'opacity-40 pointer-events-none',
      )}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Icon name={recording ? 'stop' : 'mic'} size={mobile ? 32 : 20} />
    </button>
  );
}
