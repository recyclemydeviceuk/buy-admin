import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Search, Star, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { insidePopover, Popover } from './Popover';
import { initials } from '../../lib/format';

export function SearchInput({ value, onChange, placeholder = 'Search…', className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="input pl-9 pr-9" />
      {value && <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 hover:bg-cream hover:text-ink" aria-label="Clear"><X size={14} /></button>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode; count?: number }>; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('inline-flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-full border border-line bg-white p-1', className)}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold transition-colors', size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-[13px]', value === o.value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-cream hover:text-ink')}>
          {o.label}
          {o.count !== undefined && <span className={cn('rounded-full px-1.5 text-[10.5px] tabular', value === o.value ? 'bg-white/20' : 'bg-cream')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: Array<{ value: T; label: string; count?: number }> }) {
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-line">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} className={cn('-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors', value === t.value ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink')}>
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-cream px-1.5 text-[10.5px] tabular">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, className, size = 'md' }: { name: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const palette = ['bg-tint-mint text-success', 'bg-tint-sky text-info', 'bg-tint-lilac text-violet', 'bg-tint-peach text-brand-700', 'bg-tint-lemon text-warn'];
  const tone = palette[name.length % palette.length];
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-lg' };
  return <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold', tone, sizes[size], className)}>{initials(name) || '?'}</span>;
}

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} fill={i <= Math.round(rating) ? 'currentColor' : 'none'} className={i <= Math.round(rating) ? '' : 'text-line'} />)}
    </span>
  );
}

export function Menu({ trigger, items, align = 'right', header }: { trigger: ReactNode; items: Array<{ label: string; onClick: () => void; danger?: boolean; icon?: ReactNode; disabled?: boolean; hint?: string } | 'divider'>; align?: 'left' | 'right'; header?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !insidePopover(e.target, ref.current) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      <Popover anchor={ref} open={open} align={align} minWidth={200} className="p-1.5">
        <div onClick={(e) => e.stopPropagation()}>
          {header && <div className="mb-1 border-b border-line-2 pb-1">{header}</div>}
          {items.map((it, i) =>
            it === 'divider' ? (
              <div key={i} className="my-1 border-t border-line-2" />
            ) : (
              <button key={i} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }} className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors disabled:opacity-40', it.danger ? 'text-brand-700 hover:bg-brand-50' : 'text-ink hover:bg-cream')}>
                {it.icon && <span className={cn('shrink-0', it.danger ? 'text-brand-700' : 'text-ink-3')}>{it.icon}</span>}
                <span className="flex-1">{it.label}</span>
                {it.hint && <span className="text-[11px] text-ink-4">{it.hint}</span>}
              </button>
            ),
          )}
        </div>
      </Popover>
    </div>
  );
}

export function FilterButton({ label, active, children, onClear }: { label: string; active?: boolean; children: ReactNode; onClear?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !insidePopover(e.target, ref.current) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors', active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:border-ink hover:text-ink')}>
        {label}
        {active && onClear ? <span role="button" onClick={(e) => { e.stopPropagation(); onClear(); }} className="-mr-1 rounded-full p-0.5 hover:bg-white/20"><X size={12} /></span> : <ChevronDown size={13} className="opacity-70" />}
      </button>
      <Popover anchor={ref} open={open} minWidth={220} className="p-3">{children}</Popover>
    </div>
  );
}

export function ProductThumb({ src, alt = '', className, size = 'md' }: { src: string; alt?: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-9 w-9 p-1', md: 'h-11 w-11 p-1.5', lg: 'h-20 w-20 p-2' };
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl bg-cream', sizes[size], className)}>
      <img src={src} alt={alt} className="h-full w-full product-img" loading="lazy" />
    </span>
  );
}

export function KeyValue({ items, className }: { items: Array<[string, ReactNode]>; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[13.5px]', className)}>
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="min-w-0 break-words font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Period-over-period change. The arrow shows the real direction; `invert` flips which direction is coloured good (refund rate, time to dispatch). */
export function Delta({ value, className, invert }: { value: number | null; className?: string; invert?: boolean }) {
  if (value === null) return <span className={cn('text-xs text-ink-3', className)}>—</span>;
  const up = value >= 0;
  const good = invert ? !up || value === 0 : up;
  return <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular', good ? 'bg-tint-mint text-success' : 'bg-tint-peach text-brand-700', className)}>{up ? '▲' : '▼'} {Math.abs(value).toFixed(0)}%</span>;
}
