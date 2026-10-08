/**
 * Toasts: top of the screen, 3 seconds, icon + one line.
 * Use: const toast = useToast(); toast.success('Saved');
 */
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
}
interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const STYLE: Record<Kind, { icon: ReactNode; color: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5" />, color: 'var(--success)' },
  error: { icon: <XCircle className="h-5 w-5" />, color: 'var(--error)' },
  info: { icon: <Info className="h-5 w-5" />, color: 'var(--primary)' },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: Kind, text: string) => {
    const id = nextId++;
    setItems((list) => [...list.slice(-2), { id, kind, text }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (t) => push('success', t),
      error: (t) => push('error', t),
      info: (t) => push('info', t),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+12px)]" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="anim-toast-in flex w-full max-w-md items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3 shadow-card"
          >
            <span style={{ color: STYLE[t.kind].color }}>{STYLE[t.kind].icon}</span>
            <span className="t-small font-medium">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
