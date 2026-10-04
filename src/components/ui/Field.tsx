import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface Base {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

function Wrap({ label, error, hint, className, id, children }: Base & { id?: string; children: ReactNode }) {
  return (
    <label htmlFor={id} className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>}
      {children}
      {error ? <span className="mt-1.5 block text-xs font-semibold text-brand-600">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const Field = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> & Base & { size?: 'sm' | 'md' }>(function Field({ label, error, hint, className, id, prefix, suffix, size = 'md', ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <Wrap label={label} error={error} hint={hint} className={className} id={inputId}>
      <span className="relative block">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[13px] font-semibold text-ink-3">{prefix}</span>}
        <input ref={ref} id={inputId} className={cn('input', size === 'sm' && 'input-sm', !!prefix && 'pl-8', !!suffix && 'pr-10')} aria-invalid={!!error} {...rest} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] text-ink-3">{suffix}</span>}
      </span>
    </Wrap>
  );
});

export function TextArea({ label, error, hint, className, id, prefix: _p, suffix: _s, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix'> & Base) {
  const inputId = id ?? rest.name;
  return (
    <Wrap label={label} error={error} hint={hint} className={className} id={inputId}>
      <textarea id={inputId} className={cn('input h-auto min-h-[110px] resize-y py-2.5')} aria-invalid={!!error} {...rest} />
    </Wrap>
  );
}

const chevron = 'bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%230B0C10%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27><polyline points=%276 9 12 15 18 9%27/></svg>")] bg-[length:14px] bg-[right_12px_center] bg-no-repeat pr-9';

export function Select({ label, error, hint, className, id, children, size = 'md', prefix: _p, suffix: _s, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'prefix'> & Base & { size?: 'sm' | 'md' }) {
  const inputId = id ?? rest.name;
  return (
    <Wrap label={label} error={error} hint={hint} className={className} id={inputId}>
      <select id={inputId} className={cn('input appearance-none font-medium', size === 'sm' && 'input-sm', chevron)} {...rest}>
        {children}
      </select>
    </Wrap>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  const toggle = () => !disabled && onChange(!checked);
  return (
    <div className={cn('flex items-start gap-3', disabled && 'opacity-50')}>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={toggle} className={cn('relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-ring disabled:cursor-not-allowed', checked ? 'bg-ink' : 'bg-line')}>
        <span className={cn('absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
      {(label || description) && (
        <span className={cn('min-w-0 select-none', !disabled && 'cursor-pointer')} onClick={toggle}>
          {label && <span className="block text-[13.5px] font-semibold">{label}</span>}
          {description && <span className="block text-xs text-ink-3">{description}</span>}
        </span>
      )}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, indeterminate, className }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; indeterminate?: boolean; className?: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5', className)} onClick={(e) => e.stopPropagation()}>
      <span className={cn('flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition-colors', checked || indeterminate ? 'border-ink bg-ink text-white' : 'border-ink/30 bg-white')}>
        {indeterminate ? <span className="h-0.5 w-2.5 rounded bg-white" /> : checked ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : null}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label && <span className="text-[13.5px] font-medium">{label}</span>}
    </label>
  );
}

export function FormSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-4 border-t border-line-2 py-5 first:border-t-0 first:pt-0 md:grid-cols-[220px_1fr]', className)}>
      <div>
        <p className="text-[13.5px] font-bold">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
