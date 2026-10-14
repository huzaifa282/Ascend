import { Icon } from '@ascendant/ui';

/**
 * Placeholder for the CommandBar (spec 9.1, built in phase 4 with the LLM
 * interpretation pipeline). Phase 0 ships a static, non-functional shell so
 * the top bar has its correct height and layout from the start.
 */
export function CommandBarSlot() {
  return (
    <div className="w-full h-touch rounded-lg bg-surface flex items-center px-3 gap-2">
      <span className="text-accent font-mono text-[15px]" aria-hidden>
        &gt;
      </span>
      <input
        className="flex-1 bg-transparent font-mono text-[15px] text-text placeholder:text-text-muted outline-none"
        placeholder="Log what you did, add a task, or ask a question…"
        disabled
        aria-label="Command bar (coming in a later phase)"
      />
      <kbd className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted border border-rule rounded-sm px-1.5 py-0.5">
        Ctrl+Shift+Space
      </kbd>
      <button
        type="button"
        className="w-touch h-touch min-w-touch min-h-touch flex items-center justify-center rounded-pill text-text-muted"
        disabled
        aria-label="Voice input is coming in a later version"
        title="Voice input is coming in a later version"
      >
        <Icon name="mic" size={20} />
      </button>
    </div>
  );
}
