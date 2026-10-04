import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { insidePopover, Popover } from './Popover';

export interface DropdownOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
  /** Used for type-ahead and the trigger when `label` is not a string. */
  text?: string;
}

interface Props<T extends string> {
  value: T | '';
  options: Array<DropdownOption<T>>;
  onChange: (v: T | '') => void;
  /** Prefix shown before the selected value on pill triggers ("Status: Paid"). */
  label?: string;
  placeholder?: string;
  /** `pill` for toolbars, `field` for forms (full width, optional label above). */
  variant?: 'pill' | 'field';
  fieldLabel?: string;
  hint?: string;
  error?: string;
  size?: 'sm' | 'md';
  clearable?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
  menuWidth?: string;
}

/** Custom select with full keyboard support: arrows, Enter, Escape, Home/End, type-ahead. */
export function Dropdown<T extends string>({ value, options, onChange, label, placeholder = 'Any', variant = 'pill', fieldLabel, hint, error, size = 'sm', clearable = true, searchable, disabled, className, align = 'left', menuWidth }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value);
  const textOf = (o: DropdownOption<T>) => o.text ?? (typeof o.label === 'string' ? o.label : String(o.value));
  const visible = useMemo(() => (query ? options.filter((o) => textOf(o).toLowerCase().includes(query.toLowerCase())) : options), [options, query]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !insidePopover(e.target, ref.current) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      setTimeout(() => searchRef.current?.focus(), 10);
    }
  }, [open, options, value]);
  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function choose(o: DropdownOption<T>) {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
  }
  function onKey(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(visible.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(visible.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (visible[active]) choose(visible[active]); }
    else if (e.key === 'Tab') setOpen(false);
    else if (!searchable && e.key.length === 1) {
      const i = options.findIndex((o) => textOf(o).toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  }

  const hasValue = !!selected;
  const trigger =
    variant === 'pill' ? (
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold transition-colors focus-ring disabled:opacity-50',
          size === 'sm' ? 'h-9 px-3.5 text-[13px]' : 'h-11 px-4 text-[14px]',
          hasValue ? 'border-ink bg-ink text-white hover:bg-ink-2' : 'border-line bg-white text-ink-2 hover:border-ink hover:text-ink',
        )}
      >
        {selected?.icon}
        {label && <span className={cn(hasValue ? 'text-white/70' : 'text-ink-3')}>{label}{hasValue ? ':' : ''}</span>}
        <span className="truncate">{selected ? textOf(selected) : label ? '' : placeholder}</span>
        {hasValue && clearable ? (
          <span role="button" aria-label="Clear" onClick={(e) => { e.stopPropagation(); onChange(''); }} className="-mr-1 rounded-full p-0.5 hover:bg-white/20"><X size={12} /></span>
        ) : (
          <ChevronDown size={13} className={cn('shrink-0 opacity-70 transition-transform', open && 'rotate-180')} />
        )}
      </button>
    ) : (
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={cn('input flex items-center gap-2 text-left font-medium', size === 'sm' && 'input-sm', !hasValue && 'text-ink-4', open && 'border-ink ring-4 ring-ink/5')}
        aria-invalid={!!error}
      >
        {selected?.icon}
        <span className="flex-1 truncate">{selected ? textOf(selected) : placeholder}</span>
        <ChevronDown size={14} className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} />
      </button>
    );

  return (
    <div ref={ref} className={cn('relative', variant === 'field' ? 'block' : 'inline-block', className)}>
      {fieldLabel && <label className="mb-1.5 block text-[13px] font-semibold text-ink">{fieldLabel}</label>}
      {trigger}
      <Popover anchor={ref} open={open} align={align} width={variant === 'field' ? 'anchor' : menuWidth ? Number.parseInt(menuWidth, 10) : undefined} minWidth={220} className="overflow-hidden">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search size={13} className="text-ink-3" />
              <input ref={searchRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} placeholder="Type to filter…" className="h-9 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-4" />
            </div>
          )}
          <div ref={listRef} role="listbox" id={id} tabIndex={-1} onKeyDown={onKey} className="max-h-72 overflow-y-auto p-1.5 outline-none">
            {!searchable && clearable && variant === 'pill' && (
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-3 hover:bg-cream')}>
                <span className="flex h-4 w-4 items-center justify-center">{!hasValue && <Check size={13} />}</span>{placeholder}
              </button>
            )}
            {visible.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                data-index={i}
                disabled={o.disabled}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors disabled:opacity-40', i === active ? 'bg-cream text-ink' : 'text-ink-2', o.value === value && 'text-ink')}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-ink">{o.value === value && <Check size={13} strokeWidth={3} />}</span>
                {o.icon && <span className="shrink-0 text-ink-3">{o.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.description && <span className="block truncate text-[11.5px] font-normal text-ink-3">{o.description}</span>}
                </span>
                {o.count !== undefined && <span className="rounded-full bg-cream px-1.5 text-[10.5px] font-bold tabular text-ink-3">{o.count}</span>}
              </button>
            ))}
            {visible.length === 0 && <p className="px-3 py-4 text-center text-xs text-ink-3">No matches.</p>}
          </div>
      </Popover>
      {error ? <span className="mt-1.5 block text-xs font-semibold text-brand-600">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-ink-3">{hint}</span> : null}
    </div>
  );
}
