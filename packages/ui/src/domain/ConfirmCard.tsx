import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { IconButton } from '../primitives/IconButton';
import { Button } from '../primitives/Button';
import { Segmented } from '../primitives/Segmented';
import { TypeTag } from '../primitives/TypeTag';
import type { TypeTagKind } from '../primitives/TypeTag';

export interface ConfirmItemStatGain {
  code: string;
  amount: number;
}

/**
 * One confirm-card follow-up question for a log item (spec 6.1/6.5) — "How
 * long?" and "How hard was it?" are both this shape. `required` gates
 * Accept; `allowCustom` adds the free-text escape hatch (with `pending`/
 * `error`/`valueLabel` describing an in-flight or resolved typed answer) for
 * questions whose preset pills might not fit, like duration. A plain pick
 * list (effort) just omits `allowCustom`.
 */
export interface FollowUpQuestion {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string | null;
  required?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
  /** True while a typed answer is being read (locally or by the model fallback). */
  pending?: boolean;
  /** Set when a typed answer couldn't be read at all. */
  error?: string;
  /** Shown instead of the raw value once a typed answer resolves, e.g. "40 MIN · 6:00 PM–6:40 PM". */
  valueLabel?: string;
}

export interface ConfirmItemData {
  id: string;
  kind: TypeTagKind;
  summary: string;
  metaChips?: string[];
  statGains?: ConfirmItemStatGain[];
  xp?: number;
  plausibilityWarning?: string;
  /** "7:00 AM or 7:00 PM?" style ambiguity; present only while unresolved. */
  ambiguityChoice?: { label: string; options: [string, string] };
  dailyMatchLabel?: string;
  /** Duration/effort follow-ups for a log item — Accept stays disabled while any required one is unanswered or pending (spec 6.1). */
  followUps?: FollowUpQuestion[];
}

export interface ConfirmCardProps {
  items: ConfirmItemData[];
  modelName?: string;
  tokenCount?: number;
  onAccept: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAmbiguityPick?: (id: string, choice: 0 | 1) => void;
  onFollowUpAnswer?: (id: string, key: string, value: string) => void;
  onDiscard: () => void;
  onEditAll: () => void;
  onAcceptAll: () => void;
}

function hasUnresolvedRequired(item: ConfirmItemData): boolean {
  return Boolean(item.followUps?.some((f) => f.required && (f.value == null || f.pending)));
}

/** Header "N ITEMS FROM ONE SENTENCE" + model; per-item meta/gains/warnings; footer TOTAL +XP (spec 9.2). */
export function ConfirmCard({
  items,
  modelName,
  tokenCount,
  onAccept,
  onEdit,
  onRemove,
  onAmbiguityPick,
  onFollowUpAnswer,
  onDiscard,
  onEditAll,
  onAcceptAll,
}: ConfirmCardProps) {
  const totalXp = items.reduce((sum, i) => sum + (i.xp ?? 0), 0);
  const hasAnyUnresolvedRequired = items.some(hasUnresolvedRequired);

  return (
    <div className="rounded-lg border border-rule bg-bg a-card-clip">
      <div className="h-[52px] flex items-center justify-between px-4 border-b border-rule">
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
          {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'} FROM ONE SENTENCE
        </span>
        {modelName && <span className="font-mono text-[11px] text-text-muted">{modelName}</span>}
      </div>

      <div>
        {items.map((item) => (
          <ConfirmItem
            key={item.id}
            item={item}
            onAccept={() => onAccept(item.id)}
            onEdit={() => onEdit(item.id)}
            onRemove={() => onRemove(item.id)}
            onAmbiguityPick={onAmbiguityPick ? (choice) => onAmbiguityPick(item.id, choice) : undefined}
            onFollowUpAnswer={onFollowUpAnswer ? (key, value) => onFollowUpAnswer(item.id, key, value) : undefined}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-rule">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] text-accent tabular-nums">TOTAL +{totalXp} XP</span>
          {tokenCount != null && (
            <span className="font-mono text-[11px] text-text-muted">{tokenCount.toLocaleString()} tokens</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={onDiscard}>
            DISCARD
          </Button>
          <Button variant="default" onClick={onEditAll}>
            EDIT
          </Button>
          <Button variant="primary" onClick={onAcceptAll} disabled={hasAnyUnresolvedRequired}>
            ACCEPT ALL
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmItem({
  item,
  onAccept,
  onEdit,
  onRemove,
  onAmbiguityPick,
  onFollowUpAnswer,
}: {
  item: ConfirmItemData;
  onAccept: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onAmbiguityPick?: (choice: 0 | 1) => void;
  onFollowUpAnswer?: (key: string, value: string) => void;
}) {
  const blocked = hasUnresolvedRequired(item);
  return (
    <div className="flex flex-wrap items-start gap-3 p-4 a-row">
      <TypeTag kind={item.kind} />
      <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
        <span className="font-display text-[15px]">{item.summary}</span>
        {item.metaChips && item.metaChips.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {item.metaChips.map((chip, i) => (
              <span key={i} className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted border border-rule rounded-sm px-1.5 py-0.5">
                {chip}
              </span>
            ))}
          </div>
        )}
        {item.statGains && item.statGains.length > 0 && (
          <div className="flex items-center gap-3">
            {item.statGains.map((g) => (
              <span key={g.code} className="font-mono text-[12px] text-accent">
                +{g.amount} {g.code}
              </span>
            ))}
          </div>
        )}
        {item.plausibilityWarning && (
          <div className="flex items-center gap-2 bg-danger-wash rounded-md px-2 py-1.5">
            <Icon name="warn" size={16} className="text-danger flex-none" />
            <span className="font-mono text-[11px] text-danger">{item.plausibilityWarning}</span>
          </div>
        )}
        {item.followUps && onFollowUpAnswer && (
          <div className="flex flex-col gap-2.5">
            {item.followUps.map((q) => (
              <FollowUpQuestionView key={q.key} question={q} onAnswer={(value) => onFollowUpAnswer(q.key, value)} />
            ))}
          </div>
        )}
        {item.ambiguityChoice && onAmbiguityPick && (
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
              {item.ambiguityChoice.label}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="default" onClick={() => onAmbiguityPick(0)}>
                {item.ambiguityChoice.options[0]}
              </Button>
              <Button variant="default" onClick={() => onAmbiguityPick(1)}>
                {item.ambiguityChoice.options[1]}
              </Button>
            </div>
          </div>
        )}
        {item.dailyMatchLabel && (
          <div className="flex items-center gap-1.5">
            <Icon name="check" size={14} className="text-ok flex-none" />
            <span className="font-mono text-[11px] text-ok">{item.dailyMatchLabel}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-none">
        {item.xp != null && <span className="font-mono text-[13px] text-accent tabular-nums mr-1">+{item.xp} XP</span>}
        <IconButton icon="check" aria-label="Accept" onClick={onAccept} disabled={blocked} />
        <IconButton icon="edit" aria-label="Edit" onClick={onEdit} />
        <IconButton icon="x" aria-label="Remove" onClick={onRemove} />
      </div>
    </div>
  );
}

/**
 * Suggested options are closest-guess pills (spec 6.1) — picking one commits
 * immediately. "Other" (when `allowCustom`) swaps in a plain text input for
 * whenever none of the guesses are right, so the person is never stuck with
 * only presets. A typed answer that needs reading (duration free text) shows
 * "Reading…" while pending and a danger-styled message if it can't be read;
 * once resolved it collapses to a confirmation line with an Edit affordance.
 */
function FollowUpQuestionView({
  question,
  onAnswer,
}: {
  question: FollowUpQuestion;
  onAnswer: (value: string) => void;
}) {
  const matchesOption = question.value != null && question.options.some((o) => o.value === question.value);
  const [customMode, setCustomMode] = useState(Boolean(question.allowCustom) && question.value != null && !matchesOption);
  const [forceEditing, setForceEditing] = useState(false);
  const [customText, setCustomText] = useState('');

  const showInput = customMode && (forceEditing || question.value == null || Boolean(question.pending) || Boolean(question.error));

  const commitCustom = () => {
    const text = customText.trim();
    if (text === '') return;
    setForceEditing(false);
    onAnswer(text);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">{question.label}</span>
      {customMode ? (
        showInput ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                disabled={question.pending}
                className="h-touch flex-1 min-w-[160px] rounded-md border border-rule bg-surface px-3 font-mono text-[13px] text-text outline-none placeholder:text-text-muted disabled:opacity-60"
                placeholder={question.customPlaceholder ?? 'Type an answer'}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onBlur={commitCustom}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitCustom();
                  }
                }}
                aria-label={`${question.label} — custom answer`}
              />
              {!question.pending && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomMode(false);
                    setForceEditing(false);
                    setCustomText('');
                  }}
                >
                  Pick instead
                </Button>
              )}
            </div>
            {question.pending && (
              <span className="font-mono text-[10.5px] uppercase tracking-[.1em] text-text-muted">Reading…</span>
            )}
            {question.error && (
              <div className="flex items-center gap-2 bg-danger-wash rounded-md px-2 py-1.5">
                <Icon name="warn" size={14} className="text-danger flex-none" />
                <span className="font-mono text-[11px] text-danger">{question.error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-text">{question.valueLabel ?? question.value}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setForceEditing(true);
                setCustomText('');
              }}
            >
              Edit
            </Button>
          </div>
        )
      ) : (
        <div className="flex items-center gap-2">
          <Segmented
            aria-label={question.label}
            value={question.value ?? ''}
            onChange={onAnswer}
            options={question.options}
          />
          {question.allowCustom && (
            <Button variant="ghost" size="sm" onClick={() => setCustomMode(true)}>
              Other
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Exported for the kitchen sink / future per-item usage without the card chrome.
export { ConfirmItem };
