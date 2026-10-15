import { create } from 'zustand';

export interface Toast {
  id: string;
  tag: string;
  title: string;
  meta?: string;
  danger?: boolean;
  route?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

/** Spec 10.8/11.4 — auto-dismissing toasts (stat up, quest complete, HP low, ...). */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => set((s) => ({ toasts: [...s.toasts, { ...toast, id: `${Date.now()}-${Math.random()}` }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
