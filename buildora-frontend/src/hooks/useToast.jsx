import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CircleCheck, className: 'text-emerald-600' },
  error: { icon: CircleAlert, className: 'text-red-600' },
  info: { icon: Info, className: 'text-brand-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m instanceof Error ? m.message : m),
      info: (m) => push('info', m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:top-4 sm:bottom-auto sm:items-end sm:pr-6">
        {toasts.map(({ id, type, message }) => {
          const { icon: Icon, className } = STYLES[type];
          return (
            <div
              key={id}
              role={type === 'error' ? 'alert' : 'status'}
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-lg shadow-neutral-900/5"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', className)} />
              <p className="flex-1 text-sm text-neutral-700">{message}</p>
              <button onClick={() => dismiss(id)} className="text-neutral-400 hover:text-neutral-600" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
