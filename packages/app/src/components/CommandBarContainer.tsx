import { invoke } from '@tauri-apps/api/core';
import { CommandBar, ConfirmCard } from '@ascendant/ui';
import type { ConfirmItemData } from '@ascendant/ui';
import type { EntryItemRow } from '@ascendant/db';
import { formatAmPm } from '@ascendant/llm';
import { classifyActivity } from '@ascendant/engine';
import { useCommandBar } from '../hooks/useCommandBar';
import { useHotkeySettings } from '../hooks/useHotkeySettings';
import { formatAccelerator } from '../lib/formatAccelerator';
import type { EntryItemXpPreview } from '../services';

// Spec 10.4's manual quick-pick is the 15/30/45/60/90 scale the rest of the
// app already uses — kept as the fallback. Reading sessions skew shorter in
// practice, so that one class gets its own closest-guess set; everything
// else (including "other") uses the shared scale. This is app-side
// presentation only — picking a pill still requires the person's Accept,
// same as typing a custom value, so it's not the LLM inventing a number.
const DEFAULT_DURATION_OPTIONS = ['15', '30', '45', '60', '90'];
const READING_DURATION_OPTIONS = ['10', '20', '30', '45', '60'];

function durationOptionsFor(activityClass: string): string[] {
  return classifyActivity(activityClass) === 'reading' ? READING_DURATION_OPTIONS : DEFAULT_DURATION_OPTIONS;
}

// This container is shared by the main window, the widget and the floating
// command window (spec 6.1/11.3) — the latter two have no router, so "open
// Settings" asks Rust to show/focus `main` and navigate it there, the same
// way every other companion "open" action works (see WidgetContent.tsx).
function openMainSettings(): void {
  void invoke('open_main', { route: '/settings/model' });
}

function toConfirmItem(row: EntryItemRow, preview: EntryItemXpPreview | null | undefined): ConfirmItemData {
  const payload = row.payload as Record<string, unknown>;

  if (row.kind === 'log') {
    const durationMin = payload.duration_min as number | null;
    const metaChips: string[] = [];
    if (durationMin) metaChips.push(`${durationMin} MIN`);
    if (payload.intensity) metaChips.push(String(payload.intensity).toUpperCase());
    if (payload.skill) metaChips.push(String(payload.skill).toUpperCase());

    const ambiguousOptions = payload.ambiguousOptions as [number, number] | null;
    const dailyMatch = payload.dailyMatch as { title: string } | null;

    return {
      id: row.id,
      kind: 'log',
      summary: String(payload.summary ?? ''),
      metaChips,
      xp: preview?.xp,
      statGains: preview?.statGains,
      plausibilityWarning: (payload.plausibilityReasons as string[] | undefined)?.[0],
      ambiguityChoice: payload.startAmbiguous && ambiguousOptions
        ? {
            label: 'What time?',
            options: [formatAmPm(new Date(ambiguousOptions[0])), formatAmPm(new Date(ambiguousOptions[1]))],
          }
        : undefined,
      dailyMatchLabel: dailyMatch ? `This completes ${dailyMatch.title}.` : undefined,
      // The model left duration_min null — spec 6.1 asks rather than guessing,
      // so XP/stat gains have something real to preview before Accept works.
      durationChoice: durationMin
        ? undefined
        : { label: 'How long?', options: durationOptionsFor(String(payload.activity_class ?? '')), value: null },
    };
  }

  if (row.kind === 'task') {
    const metaChips: string[] = [];
    if (payload.due_text) metaChips.push(String(payload.due_text).toUpperCase());
    if (payload.difficulty) metaChips.push(`DIFFICULTY ${payload.difficulty}`);
    return { id: row.id, kind: 'task', summary: String(payload.title ?? ''), metaChips };
  }

  if (row.kind === 'reschedule') {
    return { id: row.id, kind: 'task', summary: `Reschedule to ${payload.due_text}` };
  }
  if (row.kind === 'complete_task') {
    return { id: row.id, kind: 'task', summary: 'Mark an existing task done' };
  }
  return { id: row.id, kind: 'log', summary: String(payload.text ?? 'Question') };
}

/** Wires the ui package's CommandBar + ConfirmCard to the real services (spec 6.1, 10.4). */
export function CommandBarContainer() {
  const { state, setValue, submit, acceptItem, acceptAll, removeItem, discard, setDuration } = useCommandBar();
  const { data: hotkey } = useHotkeySettings();
  // An accept-time error (the service's duration guard, as a backstop) surfaces
  // here while still showing the confirm card, instead of replacing it.
  const acceptError = state.status === 'needs_confirm' ? state.error : undefined;

  return (
    <div className="w-full flex flex-col gap-2">
      <CommandBar
        value={state.value}
        onChange={setValue}
        onSubmit={submit}
        hotkeyHint={formatAccelerator(hotkey?.combo ?? 'CommandOrControl+Shift+Space')}
        micDisabled
        micTitle="Voice input is coming in a later version"
        disabled={state.status === 'interpreting'}
        showStatusStrip={
          state.status === 'interpreting' || state.status === 'error' || state.status === 'queued' || Boolean(acceptError)
        }
        status={
          state.status === 'interpreting'
            ? 'interpreting'
            : state.status === 'error' || acceptError
              ? 'error'
              : state.status === 'queued'
                ? 'offline_queued'
                : 'idle'
        }
        statusText={
          state.status === 'interpreting'
            ? 'Interpreting…'
            : state.status === 'error' || state.status === 'queued'
              ? state.error
              : acceptError
        }
        fixAction={
          state.status === 'queued' && state.needsModelSetup ? (
            <button
              type="button"
              onClick={openMainSettings}
              className="font-mono text-[11px] uppercase tracking-[.1em] text-accent hover:underline flex-none"
            >
              OPEN SETTINGS
            </button>
          ) : undefined
        }
      />
      {state.status === 'needs_confirm' && state.items.length > 0 && (
        <ConfirmCard
          items={state.items.map((item) => toConfirmItem(item, state.previews[item.id]))}
          onAccept={acceptItem}
          onEdit={() => {}}
          onRemove={removeItem}
          onDurationPick={(id, value) => setDuration(id, Number(value))}
          onDiscard={discard}
          onEditAll={() => {}}
          onAcceptAll={acceptAll}
        />
      )}
    </div>
  );
}
