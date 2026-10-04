import { Fragment, useMemo } from 'react';
import type { Condition, Variant } from '../../types';
import { cn } from '../../lib/cn';
import { CONDITION_LABEL, CONDITION_ORDER, storageIndex } from '../../lib/format';

interface Props {
  variants: Variant[];
  storages: string[];
  networks: string[];
  lowStock: number;
  onChange: (next: Variant[]) => void;
  mode: 'price' | 'stock';
}

const key = (s: string, n: string, c: Condition) => `${s}|${n}|${c}`;

/** Editable storage × network × condition grid. Cells edit price or stock depending on `mode`. */
export function VariantMatrix({ variants, storages, networks, lowStock, onChange, mode }: Props) {
  const map = useMemo(() => new Map(variants.map((v) => [key(v.storage, v.network, v.condition), v])), [variants]);
  const sortedStorages = [...storages].sort((a, b) => storageIndex(a) - storageIndex(b));

  function update(s: string, n: string, c: Condition, field: 'price' | 'stock', raw: string) {
    const value = Math.max(0, Math.round(Number(raw) || 0));
    const k = key(s, n, c);
    const existing = map.get(k);
    const next = existing ? variants.map((v) => (v === existing ? { ...v, [field]: value } : v)) : [...variants, { storage: s, network: n, condition: c, price: field === 'price' ? value : 0, stock: field === 'stock' ? value : 0 }];
    onChange(next);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-cream-2/70">
            <th className="th sticky left-0 z-10 bg-cream-2/95 backdrop-blur">Storage / network</th>
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
                <td colSpan={5} className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{s}</td>
              </tr>
              {networks.map((n) => {
                const rowVariants = CONDITION_ORDER.map((c) => map.get(key(s, n, c)));
                const rowTotal = rowVariants.reduce((t, v) => t + (v ? (mode === 'price' ? 0 : v.stock) : 0), 0);
                return (
                  <tr key={`${s}-${n}`} className="border-t border-line-2 hover:bg-cream-2/50">
                    <td className="td sticky left-0 z-10 bg-white font-semibold">{n}</td>
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
                              aria-label={`${s} ${n} ${CONDITION_LABEL[c]} ${mode}`}
                            />
                          </span>
                        </td>
                      );
                    })}
                    <td className="td text-right text-ink-3 tabular">{mode === 'stock' ? `${rowTotal} units` : rowVariants.every(Boolean) ? `${Math.min(...rowVariants.map((v) => v!.price))}–${Math.max(...rowVariants.map((v) => v!.price))}` : '—'}</td>
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
