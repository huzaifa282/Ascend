import { Icon } from '../icons/Icon';
import { IconButton } from '../primitives/IconButton';
import { Button } from '../primitives/Button';
import { TypeTag } from '../primitives/TypeTag';
import type { TypeTagKind } from '../primitives/TypeTag';

export interface ConfirmItemStatGain {
  code: string;
  amount: number;
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
}

export interface ConfirmCardProps {
  items: ConfirmItemData[];
  modelName?: string;
  tokenCount?: number;
  onAccept: (id: string) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAmbiguityPick?: (id: string, choice: 0 | 1) => void;
  onDiscard: () => void;
  onEditAll: () => void;
  onAcceptAll: () => void;
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
  onDiscard,
  onEditAll,
  onAcceptAll,
}: ConfirmCardProps) {
  const totalXp = items.reduce((sum, i) => sum + (i.xp ?? 0), 0);

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
          <Button variant="primary" onClick={onAcceptAll}>
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
}: {
  item: ConfirmItemData;
  onAccept: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onAmbiguityPick?: (choice: 0 | 1) => void;
}) {
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
        <IconButton icon="check" aria-label="Accept" onClick={onAccept} />
        <IconButton icon="edit" aria-label="Edit" onClick={onEdit} />
        <IconButton icon="x" aria-label="Remove" onClick={onRemove} />
      </div>
    </div>
  );
}

// Exported for the kitchen sink / future per-item usage without the card chrome.
export { ConfirmItem };
