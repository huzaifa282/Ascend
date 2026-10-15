import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '@ascendant/ui';
import { useToastStore } from '../stores/useToastStore';

const AUTO_DISMISS_MS = 5000;

function ToastItem({ id, tag, title, meta, danger, route }: ReturnType<typeof useToastStore.getState>['toasts'][number]) {
  const dismiss = useToastStore((s) => s.dismiss);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  return (
    <div
      onClick={() => {
        if (route) navigate(route);
        dismiss(id);
      }}
      className="cursor-pointer"
    >
      <Notification
        appLabel="ASCENDANT"
        tag={tag}
        time={new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        title={title}
        meta={meta}
        danger={danger}
      />
    </div>
  );
}

/** Fixed bottom-right stack, newest on top. */
export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col-reverse gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
