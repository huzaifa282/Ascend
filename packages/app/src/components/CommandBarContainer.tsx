import { invoke } from '@tauri-apps/api/core';
import { CommandBar, ConfirmCard } from '@ascendant/ui';
import type { ConfirmItemData, FollowUpQuestion } from '@ascendant/ui';
import type { EntryItemRow } from '@ascendant/db';
import { formatAmPm } from '@ascendant/llm';
import { classifyActivityType, type ActivityType, type Intensity } from '@ascendant/engine';
import { useCommandBar } from '../hooks/useCommandBar';
import { useHotkeySettings } from '../hooks/useHotkeySettings';
import { formatAccelerator } from '../lib/formatAccelerator';
import { durationSuggestions, effortLabels } from '../lib/followUps';
import type { EntryItemXpPreview } from '../services';

// This container is shared by the main window, the widget and the floating
// command window (spec 6.1/11.3) — the latter two have no router, so "open
// Settings" asks Rust to show/focus `main` and navigate it there, the same
// way every other companion "open" action works (see WidgetContent.tsx).
function openMainSettings(): void {
  void invoke('open_main', { route: '/settings/model' });
}

function buildDurationFollowUp(
  payload: Record<string, unknown>,
  activityType: ActivityType,
  pending: boolean,
  error: string | undefined,
): FollowUpQuestion {
  const durationMin = payload.duration_min as number | null;
  const resolvedStartedAt = payload.resolvedStartedAt as number | null;

  let valueLabel: string | undefined;
  if (durationMin) {
    valueLabel =
      resolvedStartedAt != null
        ? `${durationMin} MIN · ${formatAmPm(new Date(resolvedStartedAt))}–${formatAmPm(new Date(resolvedStartedAt + durationMin * 60000))}`
        : `${durationMin} MIN`;
  }

  return {
    key: 'duration',
    label: 'How long?',
    options: durationSuggestions(
      activityType,
      (payload.distance_km as number | null) ?? null,
      (payload.pages as number | null) ?? null,
    ).map((o) => ({ value: o, label: o })),
    value: durationMin ? String(durationMin) : null,
    required: true,
    allowCustom: true,
    customPlaceholder: '45 min, 1h20, 6:00–6:40',
    pending,
    error,
    valueLabel,
  };
}

function buildEffortFollowUp(payload: Record<string, unknown>, activityType: ActivityType): FollowUpQuestion {
  const labels = effortLabels(activityType);
  const intensity = (payload.intensity as Intensity | undefined) ?? 'moderate';
  return {
    key: 'effort',
    label: 'How hard was it?',
    options: [
      { value: 'light', label: labels.light },
      { value: 'moderate', label: labels.moderate },
      { value: 'hard', label: labels.hard },
    ],
    value: intensity,
  };
}

function toConfirmItem(
  row: EntryItemRow,
  preview: EntryItemXpPreview | null | undefined,
  durationPending: boolean,
  durationError: string | undefined,
): ConfirmItemData {
  const payload = row.payload as Record<string, unknown>;

  if (row.kind === 'log') {
    const activityType: ActivityType =
      (payload.activity_type as ActivityType | null) ?? classifyActivityType(String(payload.activity_class ?? ''));
    const durationMin = payload.duration_min as number | null;

    const metaChips: string[] = [];
    if (durationMin) metaChips.push(`${durationMin} MIN`);
    if (payload.skill) metaChips.push(String(payload.skill).toUpperCase());

    const ambiguousOptions = payload.ambiguousOptions as [number, number] | null;
    const dailyMatch = payload.dailyMatch as { title: string } | null;

    const followUps: FollowUpQuestion[] = [];
    // The model left duration_min null — spec 6.1 asks rather than guessing,
    // so XP/stat gains have something real to preview before Accept works.
    if (!durationMin) {
      followUps.push(buildDurationFollowUp(payload, activityType, durationPending, durationError));
    }
    // Always asked, with the model's own guess preselected — effort changes
    // XP just like duration does, so it isn't left silently hidden (spec 5.2).
    followUps.push(buildEffortFollowUp(payload, activityType));

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
      followUps,
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
  const { state, setValue, submit, acceptItem, acceptAll, removeItem, discard, answerDuration, setEffort } = useCommandBar();
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
          items={state.items.map((item) =>
            toConfirmItem(item, state.previews[item.id], Boolean(state.durationPending[item.id]), state.durationErrors[item.id]),
          )}
          onAccept={acceptItem}
          onEdit={() => {}}
          onRemove={removeItem}
          onFollowUpAnswer={(id, key, value) => {
            if (key === 'duration') void answerDuration(id, value);
            else if (key === 'effort') void setEffort(id, value as Intensity);
          }}
          onDiscard={discard}
          onEditAll={() => {}}
          onAcceptAll={acceptAll}
        />
      )}
    </div>
  );
}
