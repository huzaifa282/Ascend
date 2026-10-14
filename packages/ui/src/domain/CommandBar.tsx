import type { ReactNode } from 'react';
import clsx from '../lib/clsx';
import { RoundButton } from '../primitives/RoundButton';

export type CommandBarStatus = 'idle' | 'connected' | 'listening' | 'interpreting' | 'offline_queued' | 'error';

export interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  hotkeyHint?: string;
  status?: CommandBarStatus;
  statusText?: string;
  fixAction?: ReactNode;
  onMicClick?: () => void;
  micDisabled?: boolean;
  micTitle?: string;
  disabled?: boolean;
  /** Status strip is shown in popups/widgets, hidden in the main top bar (spec 9.2). */
  showStatusStrip?: boolean;
  className?: string;
}

const STATUS_DOT: Record<CommandBarStatus, string> = {
  idle: 'bg-text-muted',
  connected: 'bg-ok',
  listening: 'bg-accent',
  interpreting: 'bg-accent',
  offline_queued: 'bg-text-muted',
  error: 'bg-danger',
};

/** Rounded lg, --surface; accent ">" prompt, mono input, hotkey key cap, mic RoundButton (spec 9.2). */
export function CommandBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Log what you did, add a task, or ask a question…",
  hotkeyHint,
  status = 'idle',
  statusText,
  fixAction,
  onMicClick,
  micDisabled = false,
  micTitle,
  disabled = false,
  showStatusStrip = false,
  className,
}: CommandBarProps) {
  return (
    <div className={clsx('w-full rounded-lg bg-surface', className)}>
      <div className="h-touch flex items-center px-3 gap-2">
        <span className="text-accent font-mono text-[15px]" aria-hidden>
          &gt;
        </span>
        <input
          className="flex-1 bg-transparent font-mono text-[15px] text-text placeholder:text-text-muted outline-none truncate"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-label="Command bar"
        />
        {hotkeyHint && (
          <kbd className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted border border-rule rounded-sm px-1.5 py-0.5 flex-none">
            {hotkeyHint}
          </kbd>
        )}
        <RoundButton
          icon="mic"
          aria-label={micTitle ?? 'Voice input'}
          title={micTitle}
          disabled={micDisabled}
          onClick={onMicClick}
        />
      </div>
      {showStatusStrip && (
        <div className="flex items-center gap-2 h-8 px-3 border-t border-rule-soft" aria-live="polite">
          <span className={clsx('w-1.5 h-1.5 rounded-pill flex-none', STATUS_DOT[status])} />
          <span className="font-mono text-[11px] text-text-muted truncate flex-1">{statusText}</span>
          {fixAction}
        </div>
      )}
    </div>
  );
}
