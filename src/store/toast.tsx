import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}
interface Ctx {
  toast: (title: string, opts?: { body?: string; tone?: Tone; duration?: number }) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback<Ctx['toast']>((title, opts) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-3), { id, title, body: opts?.body, tone: opts?.tone ?? 'info' }]);
    setTimeout(() => dismiss(id), opts?.duration ?? (opts?.tone === 'error' ? 7000 : 3800));
  }, [dismiss]);
  const value = useMemo<Ctx>(() => ({
    toast,
    success: (t, b) => toast(t, { body: b, tone: 'success' }),
    error: (t, b) => toast(t, { body: b, tone: 'error' }),
    info: (t, b) => toast(t, { body: b, tone: 'info' }),
  }), [toast]);
  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tones = { success: 'text-success', error: 'text-brand-600', info: 'text-info' };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {items.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-toast">
              <Icon size={18} className={cn('mt-0.5 shrink-0', tones[t.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug">{t.title}</p>
                {t.body && <p className="mt-0.5 text-[13px] text-ink-3">{t.body}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded-lg p-1 text-ink-3 hover:bg-cream hover:text-ink" aria-label="Dismiss"><X size={14} /></button>
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
