import { CommandBar, ConfirmCard } from '@ascendant/ui';
import type { ConfirmItemData } from '@ascendant/ui';
import type { EntryItemRow } from '@ascendant/db';
import { formatAmPm } from '@ascendant/llm';
import { useCommandBar } from '../hooks/useCommandBar';

function toConfirmItem(row: EntryItemRow): ConfirmItemData {
  const payload = row.payload as Record<string, unknown>;

  if (row.kind === 'log') {
    const metaChips: string[] = [];
    if (payload.duration_min) metaChips.push(`${payload.duration_min} MIN`);
    if (payload.intensity) metaChips.push(String(payload.intensity).toUpperCase());
    if (payload.skill) metaChips.push(String(payload.skill).toUpperCase());

    const ambiguousOptions = payload.ambiguousOptions as [number, number] | null;
    const dailyMatch = payload.dailyMatch as { title: string } | null;

    return {
      id: row.id,
      kind: 'log',
      summary: String(payload.summary ?? ''),
      metaChips,
      plausibilityWarning: (payload.plausibilityReasons as string[] | undefined)?.[0],
      ambiguityChoice: payload.startAmbiguous && ambiguousOptions
        ? {
            label: 'What time?',
            options: [formatAmPm(new Date(ambiguousOptions[0])), formatAmPm(new Date(ambiguousOptions[1]))],
          }
        : undefined,
      dailyMatchLabel: dailyMatch ? `This completes ${dailyMatch.title}.` : undefined,
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
  const { state, setValue, submit, acceptItem, acceptAll, removeItem, discard } = useCommandBar();

  return (
    <div className="w-full flex flex-col gap-2">
      <CommandBar
        value={state.value}
        onChange={setValue}
        onSubmit={submit}
        hotkeyHint="Ctrl+Shift+Space"
        micDisabled
        micTitle="Voice input is coming in a later version"
        disabled={state.status === 'interpreting'}
        showStatusStrip={state.status === 'interpreting' || state.status === 'error'}
        status={state.status === 'interpreting' ? 'interpreting' : state.status === 'error' ? 'error' : 'idle'}
        statusText={
          state.status === 'interpreting'
            ? 'Interpreting…'
            : state.status === 'error'
              ? state.error
              : undefined
        }
      />
      {state.status === 'needs_confirm' && state.items.length > 0 && (
        <ConfirmCard
          items={state.items.map(toConfirmItem)}
          onAccept={acceptItem}
          onEdit={() => {}}
          onRemove={removeItem}
          onDiscard={discard}
          onEditAll={() => {}}
          onAcceptAll={acceptAll}
        />
      )}
    </div>
  );
}
