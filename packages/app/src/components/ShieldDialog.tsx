import { Button, Icon, Modal } from '@ascendant/ui';
import { useShieldStatus, useRestShield } from '../hooks';

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'long' });

export interface ShieldDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Spec 10.7 — use-shield dialog. */
export function ShieldDialog({ open, onClose }: ShieldDialogProps) {
  const { data: status } = useShieldStatus();
  const restShield = useRestShield();

  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = MONTH_FORMAT.format(now);
  const nextMonthLabel = `${nextMonth.getDate()} ${MONTH_FORMAT.format(nextMonth)}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rest today?"
      footer={
        <>
          <Button variant="default" onClick={onClose}>
            NOT TODAY
          </Button>
          <Button
            variant="primary"
            disabled={!status || status.remaining <= 0 || restShield.isPending}
            onClick={async () => {
              const result = await restShield.mutateAsync();
              if (result.ok) onClose();
            }}
          >
            USE SHIELD
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: status?.remaining ?? 0 }, (_, i) => (
            <Icon key={i} name="shield" size={28} className="text-accent" />
          ))}
          {status && status.remaining === 0 && <Icon name="shield" size={28} className="text-text-muted" />}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">
          {status?.remaining ?? 0} shield{status?.remaining === 1 ? '' : 's'} left in {monthLabel} / resets on {nextMonthLabel}
        </span>
        <p className="text-text-muted">
          A shield freezes your streak and skips today&apos;s daily quests without any HP loss. Dailies show
          &ldquo;Rest / frozen&rdquo; for the day and can&apos;t fail.
        </p>
        {status && status.remaining <= 0 && (
          <p className="font-mono text-[11px] text-danger">No shields left this month.</p>
        )}
      </div>
    </Modal>
  );
}
