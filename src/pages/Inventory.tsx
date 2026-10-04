import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Download, Percent, Save, Undo2 } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { Condition, PriceRule, StockFilter, VariantRow, VariantUpdate } from '../types';
import { Card, PageHeader, Stat } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Select } from '../components/ui/Field';
import { Dropdown } from '../components/ui/Dropdown';
import { ProductThumb, SearchInput, Segmented } from '../components/ui/Misc';
import { DensityToggle, Pagination, Table, type Column } from '../components/ui/Table';
import { ConditionBadge, StockBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { CONDITION_LABEL, imageUrl, money, number, savingsPct } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { cn } from '../lib/cn';

const rowKey = (r: VariantRow) => `${r.productId}|${r.storage}|${r.network}|${r.condition}`;

export default function Inventory() {
  const toast = useToast();
  const { can } = useAuth();
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const stock = (get('stock') as StockFilter | '') || '';
  const brand = get('brand');
  const network = get('network');
  const condition = get('condition') as Condition | '';
  const storage = get('storage');
  const sort = get('sort', 'product') as 'product' | 'stock-asc' | 'stock-desc' | 'price-asc' | 'price-desc';
  const page = getNum('page', 1);
  const pageSize = 50;
  const query = useMemo(() => ({ search: q || undefined, stock: stock || undefined, brand: brand || undefined, network: network || undefined, condition: condition || undefined, storage: storage || undefined, sort, page, pageSize }), [q, stock, brand, network, condition, storage, sort, page]);
  const { data, loading, reload } = useAsync(() => api.listVariants(query), [query]);
  const { data: settings } = useAsync(() => api.getSettings(), []);
  if (q !== get('q')) set({ q }, true);
  const low = settings?.lowStockThreshold ?? 2;
  const editable = can('inventory.edit');

  const [edits, setEdits] = useState<Record<string, { price?: number; stock?: number }>>({});
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState<PriceRule | null>(null);
  const [preview, setPreview] = useState<{ affected: number; sampleBefore: number; sampleAfter: number } | null>(null);
  const editCount = Object.keys(edits).length;

  function edit(r: VariantRow, field: 'price' | 'stock', raw: string) {
    const v = Math.max(0, Math.round(Number(raw) || 0));
    const k = rowKey(r);
    setEdits((e) => {
      const next = { ...e, [k]: { ...e[k], [field]: v } };
      if (next[k].price === r.price) delete next[k].price;
      if (next[k].stock === r.stock) delete next[k].stock;
      if (next[k].price === undefined && next[k].stock === undefined) delete next[k];
      return next;
    });
  }

  async function saveEdits() {
    setSaving(true);
    const updates: VariantUpdate[] = Object.entries(edits).map(([k, v]) => {
      const [productId, storage, network, condition] = k.split('|');
      return { productId, storage, network, condition: condition as Condition, ...v };
    });
    try {
      const r = await api.updateVariants(updates);
      toast.success(`${r.updated} ${r.updated === 1 ? 'variant' : 'variants'} updated`);
      setEdits({});
      reload();
    } catch (e) {
      toast.error('Could not save', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function updatePreview(next: PriceRule) {
    setRule(next);
    setPreview(await api.previewPriceRule(next));
  }

  async function applyRule() {
    if (!rule) return;
    setSaving(true);
    try {
      const r = await api.applyPriceRule(rule);
      toast.success('Price rule applied', `${r.affected} variants changed`);
      setRule(null);
      setPreview(null);
      reload();
    } catch (e) {
      toast.error('Could not apply rule', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    const all = await api.listVariants({ ...query, page: 1, pageSize: 10000 });
    downloadCsv(`buyupon-inventory-${new Date().toISOString().slice(0, 10)}.csv`, all.items.map((r) => ({ product: r.productName, slug: r.slug, storage: r.storage, network: r.network, condition: r.condition, price: r.price, rrp: r.rrp, stock: r.stock })));
    toast.success('CSV exported', `${all.items.length} variants`);
  }

  const columns: Column<VariantRow>[] = [
    { key: 'product', header: 'Product', render: (r) => (
      <Link to={`/products/${r.productId}`} className="flex items-center gap-3 hover:underline" onClick={(e) => e.stopPropagation()}>
        <ProductThumb src={imageUrl(r.image)} size="sm" />
        <span className="truncate font-semibold">{r.productName}</span>
      </Link>
    ) },
    { key: 'variant', header: 'Variant', render: (r) => <span className="flex items-center gap-2 text-[13px]"><b>{r.storage}</b><span className="text-ink-3">·</span>{r.network}<span className="text-ink-3">·</span><ConditionBadge condition={r.condition} /></span> },
    { key: 'status', header: 'Status', render: (r) => <StockBadge stock={edits[rowKey(r)]?.stock ?? r.stock} low={low} /> },
    { key: 'price', header: 'Price', align: 'right', render: (r) => {
      const e = edits[rowKey(r)]?.price;
      return (
        <span className="relative inline-block">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs font-semibold text-ink-3">£</span>
          <input type="number" min={0} disabled={!editable} value={e ?? r.price} onChange={(ev) => edit(r, 'price', ev.target.value)} onFocus={(ev) => ev.target.select()} className={cn('h-9 w-24 rounded-xl border bg-white pl-5 pr-2 text-right text-[13px] font-semibold tabular focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5', e !== undefined ? 'border-info bg-tint-sky/40' : 'border-line')} aria-label="Price" />
        </span>
      );
    } },
    { key: 'margin', header: 'vs RRP', align: 'right', render: (r) => <span className="text-xs text-ink-3 tabular">{savingsPct(edits[rowKey(r)]?.price ?? r.price, r.rrp)}% off £{r.rrp}</span> },
    { key: 'stock', header: 'Stock', align: 'right', render: (r) => {
      const e = edits[rowKey(r)]?.stock;
      return <input type="number" min={0} disabled={!editable} value={e ?? r.stock} onChange={(ev) => edit(r, 'stock', ev.target.value)} onFocus={(ev) => ev.target.select()} className={cn('h-9 w-20 rounded-xl border bg-white px-2 text-center text-[13px] font-semibold tabular focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5', e !== undefined ? 'border-info bg-tint-sky/40' : 'border-line')} aria-label="Stock" />;
    } },
  ];

  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Inventory & pricing" subtitle={editable ? 'Every sellable variant across the catalogue. Edit cells inline, then save.' : 'Every sellable variant across the catalogue. Your role can view but not edit stock.'} actions={<><Button size="sm" variant="secondary" onClick={() => void exportCsv()}><Download size={15} /> Export CSV</Button>{can('pricing.rules') && <Button size="sm" onClick={() => void updatePreview({ mode: 'percent', amount: -5, roundTo: 9 })}><Percent size={15} /> Bulk price rule</Button>}</>} />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Units on hand" value={number(data.summary.units)} sub={`${money(data.summary.value)} at sale price`} className="bg-white border border-line" />
          <Stat label="Healthy" value={number(data.summary.inStock)} sub="variants" className="bg-tint-mint/60" />
          <Stat label="Low stock" value={number(data.summary.low)} sub={`≤ ${low} units`} className="bg-tint-lemon/60" />
          <Stat label="Out of stock" value={number(data.summary.out)} sub="hidden on storefront" className="bg-tint-peach/60" />
          <Stat label="Variants" value={number(data.summary.inStock + data.summary.low + data.summary.out)} sub="active + draft" className="bg-white border border-line" />
        </div>
      )}

      <div className="mb-4"><Segmented value={stock || 'all'} onChange={(v) => set({ stock: v === 'all' ? '' : v })} options={[{ value: 'all', label: 'All' }, { value: 'low', label: 'Low stock', count: data?.summary.low }, { value: 'out', label: 'Out of stock', count: data?.summary.out }, { value: 'in', label: 'Healthy' }]} /></div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Model, storage, network…" className="w-full md:w-72" />
          <Dropdown label="Brand" value={brand} onChange={(v) => set({ brand: v })} options={[{ value: 'Apple', label: 'Apple' }, { value: 'Samsung', label: 'Samsung' }]} />
          <Dropdown label="Storage" value={storage} onChange={(v) => set({ storage: v })} options={(settings?.storages ?? []).map((s) => ({ value: s, label: s }))} />
          <Dropdown label="Network" value={network} onChange={(v) => set({ network: v })} options={(settings?.networks ?? []).map((n) => ({ value: n, label: n }))} />
          <Dropdown label="Grade" value={condition} onChange={(v) => set({ condition: v })} options={(['excellent', 'good', 'fair'] as Condition[]).map((c) => ({ value: c, label: CONDITION_LABEL[c] }))} />
          {(brand || storage || network || condition || search) && <Button size="xs" variant="ghost" onClick={() => { setSearch(''); set({ q: '', brand: '', storage: '', network: '', condition: '' }); }}>Clear</Button>}
          <div className="ml-auto flex items-center gap-2">
            <Dropdown label="Sort" clearable={false} align="right" value={sort} onChange={(v) => v && set({ sort: v })} options={[{ value: 'product', label: 'By product' }, { value: 'stock-asc', label: 'Stock low → high' }, { value: 'stock-desc', label: 'Stock high → low' }, { value: 'price-asc', label: 'Price low → high' }, { value: 'price-desc', label: 'Price high → low' }]} />
            <DensityToggle />
          </div>
        </div>
        <Table columns={columns} rows={data?.items ?? []} rowKey={rowKey} loading={loading} empty={<EmptyState icon={Boxes} title="No variants match" body="Try widening the filters." />} />
        {data && data.total > 0 && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)} />}
      </Card>

      {editCount > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex animate-pop items-center gap-3 rounded-full border border-line bg-ink px-5 py-2.5 text-white shadow-toast">
            <span className="text-[13px] font-semibold">{editCount} unsaved {editCount === 1 ? 'change' : 'changes'}</span>
            <Button size="xs" variant="light" onClick={() => setEdits({})}><Undo2 size={13} /> Discard</Button>
            <Button size="xs" variant="primary" loading={saving} onClick={() => void saveEdits()}><Save size={13} /> Save</Button>
          </div>
        </div>
      )}

      <Modal open={!!rule} onClose={() => { setRule(null); setPreview(null); }} title="Bulk price rule" subtitle="Change many prices at once. Applies to active and draft products." footer={<><Button size="sm" variant="ghost" onClick={() => { setRule(null); setPreview(null); }}>Cancel</Button><Button size="sm" variant="primary" loading={saving} disabled={!preview?.affected || !rule?.amount} onClick={() => void applyRule()}>Apply to {preview?.affected ?? 0} variants</Button></>}>
        {rule && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Change" value={rule.mode} onChange={(e) => void updatePreview({ ...rule, mode: e.target.value as PriceRule['mode'] })}><option value="percent">By percentage</option><option value="fixed">By fixed amount</option></Select>
              <Field label={rule.mode === 'percent' ? 'Percent (negative = cheaper)' : 'Amount in £ (negative = cheaper)'} type="number" value={rule.amount} onChange={(e) => void updatePreview({ ...rule, amount: Number(e.target.value) })} suffix={rule.mode === 'percent' ? '%' : '£'} />
              <Select label="Brand" value={rule.brand ?? ''} onChange={(e) => void updatePreview({ ...rule, brand: e.target.value || undefined, series: undefined })}><option value="">All brands</option><option>Apple</option><option>Samsung</option></Select>
              <Select label="Grade" value={rule.condition ?? ''} onChange={(e) => void updatePreview({ ...rule, condition: (e.target.value || undefined) as Condition | undefined })}><option value="">All grades</option>{(['excellent', 'good', 'fair'] as Condition[]).map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}</Select>
              <Select label="Network" value={rule.network ?? ''} onChange={(e) => void updatePreview({ ...rule, network: e.target.value || undefined })}><option value="">All networks</option>{(settings?.networks ?? []).map((n) => <option key={n}>{n}</option>)}</Select>
              <Select label="Rounding" value={rule.roundTo === undefined ? '' : String(rule.roundTo)} onChange={(e) => void updatePreview({ ...rule, roundTo: e.target.value === '' ? undefined : Number(e.target.value) })}><option value="">Nearest £1</option><option value="9">End in £9 (£149, £199)</option><option value="5">End in £5</option><option value="0">Nearest £10</option></Select>
            </div>
            <div className="rounded-2xl bg-cream p-4 text-[13px]">
              {preview ? (
                <>
                  <p><b className="tabular">{number(preview.affected)}</b> variants match.</p>
                  {preview.affected > 0 && <p className="mt-1 text-ink-3">Example: {money(preview.sampleBefore)} → <b className="text-ink">{money(preview.sampleAfter)}</b></p>}
                </>
              ) : 'Calculating…'}
            </div>
            <p className="text-xs text-ink-3">This cannot be undone automatically. Export a CSV first if you want a backup of current prices.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
