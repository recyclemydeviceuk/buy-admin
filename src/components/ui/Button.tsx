import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'light';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const base = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-all duration-150 focus-ring disabled:opacity-50 disabled:pointer-events-none active:scale-[.98]';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_10px_24px_-10px_rgba(208,26,42,.6)]',
  dark: 'bg-ink text-white hover:bg-ink-2',
  secondary: 'bg-white text-ink border border-line hover:border-ink',
  ghost: 'bg-transparent text-ink-2 hover:bg-cream hover:text-ink',
  danger: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  light: 'bg-cream text-ink hover:bg-cream-3',
};
const sizes: Record<Size, string> = { xs: 'h-8 px-3 text-xs', sm: 'h-9 px-4 text-[13px]', md: 'h-11 px-5 text-[14px]', lg: 'h-12 px-6 text-[15px]' };

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  to?: string;
  href?: string;
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant = 'dark', size = 'md', className, to, href, loading, children, disabled, ...rest }, ref) {
  const cls = cn(base, variants[variant], sizes[size], className);
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{children}</a>;
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
});

export function IconButton({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-cream hover:text-ink focus-ring disabled:opacity-40', className)} {...rest}>
      {children}
    </button>
  );
}
