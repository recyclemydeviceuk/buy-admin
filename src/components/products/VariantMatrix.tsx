import { Fragment, useMemo } from 'react';
import type { Colour, Condition, Variant } from '../../types';
import { cn } from '../../lib/cn';
import { CONDITION_LABEL, CONDITION_ORDER, storageIndex } from '../../lib/format';

interface Props {
  variants: Variant[];
  storages: string[];
  /** The product's colours. With none, each storage has a single row of colourless variants. */
  colours: Colour[];
  lowStock: number;
  onChange: (next: Variant[]) => void;
  mode: 'price' | 'stock';
}

const key = (s: string, n: string, c: Condition) => `${s}|${n}|${c}`;

/** Editable storage × colour × condition grid. Cells edit price or stock depending on `mode`. */
export function VariantMatrix({ variants, storages, colours, lowStock, onChange, mode }: Props) {
  const map = useMemo(() => new Map(variants.map((v) => [key(v.storage, v.colour, v.condition), v])), [variants]);
  const rows: Array<Pick<Colour, 'name' | 'hex'>> = colours.length ? colours : [{ name: '', hex: '' }];
  const sortedStorages = [...storages].sort((a, b) => storageIndex(a) - storageIndex(b));

  function update(s: string, n: string, c: Condition, field: 'price' | 'stock', raw: string) {
    const value = Math.max(0, Math.round(Number(raw) || 0));
    const k = key(s, n, c);
    const existing = map.get(k);
    const next = existing ? variants.map((v) => (v === existing ? { ...v, [field]: value } : v)) : [...variants, { storage: s, colour: n, condition: c, price: field === 'price' ? value : 0, stock: field === 'stock' ? value : 0 }];
    onChange(next);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[820px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-cream-2/70">
            <th className="th sticky left-0 z-10 bg-cream-2/95 backdrop-blur">{colours.length ? 'Storage / colour' : 'Storage'}</th>
            {CONDITION_ORDER.map((c) => (
              <th key={c} className="th text-center" colSpan={1}>{CONDITION_LABEL[c]}</th>
            ))}
            <th className="th text-right">Row total</th>
          </tr>
        </thead>
        <tbody>
          {sortedStorages.map((s) => (
            <Fragment key={s}>
              <tr className="border-t border-line bg-cream/60">
                <td colSpan={CONDITION_ORDER.length + 2} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{s}</td>
              </tr>
              {rows.map(({ name: n, hex }) => {
                const rowVariants = CONDITION_ORDER.map((c) => map.get(key(s, n, c)));
                const rowTotal = rowVariants.reduce((t, v) => t + (v ? v.stock : 0), 0);
                const prices = rowVariants.filter((v): v is Variant => !!v && v.price > 0).map((v) => v.price);
                return (
                  <tr key={`${s}-${n}`} className="border-t border-line-2 hover:bg-cream-2/50">
                    <td className="td sticky left-0 z-10 bg-white font-semibold">{n ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/15" style={{ backgroundColor: hex }} />{n}</span> : <span className="text-ink-3">No colour set</span>}</td>
                    {CONDITION_ORDER.map((c) => {
                      const v = map.get(key(s, n, c));
                      const val = v ? v[mode] : 0;
                      const warn = mode === 'stock' && v && v.stock > 0 && v.stock <= lowStock;
                      const out = mode === 'stock' && (!v || v.stock === 0);
                      return (
                        <td key={c} className="td text-center">
                          <span className="relative inline-block">
                            {mode === 'price' && <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs font-semibold text-ink-3">£</span>}
                            <input
                              type="number"
                              min={0}
                              value={val}
                              onChange={(e) => update(s, n, c, mode, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className={cn('h-9 w-24 rounded-xl border bg-white text-center text-[13px] font-semibold tabular transition-all focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5', mode === 'price' && 'pl-4', out ? 'border-line text-ink-4' : warn ? 'border-warn/40 bg-tint-lemon/40 text-warn' : 'border-line')}
                              aria-label={[s, n, CONDITION_LABEL[c], mode].filter(Boolean).join(' ')}
                            />
                          </span>
                        </td>
                      );
                    })}
                    <td className="td text-right text-ink-3 tabular">{mode === 'stock' ? `${rowTotal} units` : prices.length ? `${Math.min(...prices)}–${Math.max(...prices)}` : '—'}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
