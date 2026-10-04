import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Rows3, Rows4 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { number } from '../../lib/format';
import { TableSkeleton } from './Skeleton';
import { useDensity, type Density } from '../../hooks/useDensity';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** When set the header is clickable and reports this key to `onSort`. */
  sortKey?: string;
  /** Hide on narrow screens. */
  hideBelow?: 'md' | 'lg' | 'xl';
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  selected?: Set<string>;
  rowClassName?: (row: T) => string | undefined;
  sort?: SortState;
  onSort?: (key: string) => void;
  density?: Density;
  footer?: ReactNode;
  minWidth?: string;
}

const HIDE = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' };

export function Table<T>({ columns, rows, rowKey, loading, empty, onRowClick, selected, rowClassName, sort, onSort, density, footer, minWidth = '720px' }: Props<T>) {
  const [stored] = useDensity();
  const dens = density ?? stored;
  if (loading && rows.length === 0) return <TableSkeleton cols={Math.min(columns.length, 6)} />;
  if (!loading && rows.length === 0) return <>{empty ?? <p className="px-4 py-12 text-center text-sm text-ink-3">Nothing to show.</p>}</>;
  const pad = dens === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3';
  return (
    <div className={cn('overflow-x-auto', loading && 'opacity-60 transition-opacity')}>
      <table className={cn('w-full border-collapse', dens === 'compact' ? 'text-[13px]' : 'text-[13.5px]')} style={{ minWidth }}>
        <thead className="sticky top-0 z-[1] border-b border-line bg-cream-2/90 backdrop-blur">
          <tr>
            {columns.map((c) => {
              const sortable = !!c.sortKey && !!onSort;
              const activeSort = sort && sort.key === c.sortKey;
              const inner = (
                <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                  {c.header}
                  {sortable && (activeSort ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} className="opacity-40" />)}
                </span>
              );
              return (
                <th key={c.key} className={cn('whitespace-nowrap text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3', dens === 'compact' ? 'px-3 py-2' : 'px-4 py-2.5', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideBelow && HIDE[c.hideBelow], c.className)} style={c.width ? { width: c.width } : undefined}>
                  {sortable ? (
                    <button type="button" onClick={() => onSort!(c.sortKey!)} className={cn('rounded-md transition-colors hover:text-ink focus-ring', activeSort && 'text-ink')}>{inner}</button>
                  ) : (
                    inner
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-2">
          {rows.map((row) => {
            const k = rowKey(row);
            return (
              <tr key={k} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-cream-2', selected?.has(k) && 'bg-tint-sky/40 hover:bg-tint-sky/50', rowClassName?.(row))}>
                {columns.map((c) => (
                  <td key={c.key} className={cn('align-middle', pad, c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideBelow && HIDE[c.hideBelow], c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {footer && (
          <tfoot className="border-t border-line bg-cream-2/60">
            <tr>{footer}</tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage, className, children }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; className?: string; children?: ReactNode }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3', className)}>
      <span className="flex items-center gap-3">
        {total === 0 ? 'No results' : <>Showing <b className="text-ink">{number(from)}–{number(to)}</b> of <b className="text-ink">{number(total)}</b></>}
        {children}
      </span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(1)} className="hidden h-8 items-center justify-center rounded-full px-2 text-xs font-semibold hover:bg-cream disabled:opacity-30 sm:inline-flex">First</button>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={16} /></button>
        <span className="px-2 font-semibold text-ink tabular">{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" aria-label="Next page"><ChevronRight size={16} /></button>
        <button disabled={page >= pages} onClick={() => onPage(pages)} className="hidden h-8 items-center justify-center rounded-full px-2 text-xs font-semibold hover:bg-cream disabled:opacity-30 sm:inline-flex">Last</button>
      </div>
    </div>
  );
}

export function DensityToggle() {
  const [d, set] = useDensity();
  return (
    <div className="inline-flex rounded-full border border-line bg-white p-0.5" role="group" aria-label="Row density">
      <button type="button" title="Compact rows" onClick={() => set('compact')} className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-colors', d === 'compact' ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}><Rows4 size={14} /></button>
      <button type="button" title="Comfortable rows" onClick={() => set('comfortable')} className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-colors', d === 'comfortable' ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}><Rows3 size={14} /></button>
    </div>
  );
}

/** Thin bar above a table summarising the filtered set. */
export function SummaryBar({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line bg-cream-2/50 px-4 py-2 text-[12px] text-ink-3">
      {items.map((i) => (
        <span key={i.label}>{i.label} <b className="text-ink tabular">{i.value}</b></span>
      ))}
    </div>
  );
}
