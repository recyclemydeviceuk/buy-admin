import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Eye, ExternalLink, MoreHorizontal, Pencil, Plus, Smartphone, Star } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { AdminProduct, ProductStatus, StockFilter } from '../types';
import { Card, PageHeader } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Menu, ProductThumb, SearchInput, Segmented } from '../components/ui/Misc';
import { DensityToggle, Pagination, SummaryBar, Table, type Column } from '../components/ui/Table';
import { ProductBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { imageUrl, money, number, savingsPct, STOREFRONT_URL, timeAgo } from '../lib/format';
import { cn } from '../lib/cn';

type Sort = 'name' | 'newest' | 'price-asc' | 'price-desc' | 'stock' | 'updated';

function StockBar({ p, low }: { p: AdminProduct; low: number }) {
  const by = { excellent: 0, good: 0, fair: 0 };
  p.variants.forEach((v) => (by[v.condition] += v.stock));
  const total = by.excellent + by.good + by.fair;
  const out = p.variants.filter((v) => v.stock === 0).length;
  const lowc = p.variants.filter((v) => v.stock > 0 && v.stock <= low).length;
  return (
    <div className="min-w-[150px]">
      <div className="flex items-center justify-between text-[12px]">
        <span className={cn('font-semibold tabular', total === 0 && 'text-brand-700')}>{number(total)} units</span>
        <span className="text-[11px] text-ink-3">{out > 0 && <span className="text-brand-700">{out} out</span>}{out > 0 && lowc > 0 && ' · '}{lowc > 0 && <span className="text-warn">{lowc} low</span>}{!out && !lowc && 'healthy'}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-cream-3" title={`Excellent ${by.excellent} · Good ${by.good} · Fair ${by.fair}`}>
        {total > 0 && (
          <>
            <span className="bg-success" style={{ width: `${(by.excellent / total) * 100}%` }} />
            <span className="bg-info" style={{ width: `${(by.good / total) * 100}%` }} />
            <span className="bg-warn" style={{ width: `${(by.fair / total) * 100}%` }} />
          </>
        )}
      </div>
      <p className="mt-0.5 text-[10.5px] text-ink-3 tabular">E {by.excellent} · G {by.good} · F {by.fair}</p>
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const status = (get('status', 'active') as ProductStatus | 'all') || 'active';
  const brand = get('brand');
  const series = get('series');
  const stock = get('stock') as StockFilter | '';
  const featured = get('featured') === '1';
  const sort = (get('sort', 'newest') as Sort) || 'newest';
  const page = getNum('page', 1);
  const pageSize = getNum('size', 25);
  const query = useMemo(() => ({ search: q || undefined, status, brand: brand || undefined, series: series || undefined, stock: stock || undefined, featured: featured || undefined, sort, page, pageSize }), [q, status, brand, series, stock, featured, sort, page, pageSize]);
  const { data, loading, reload } = useAsync(() => api.listProducts(query), [query]);
  const { data: all } = useAsync(() => api.listProducts({ ...query, page: 1, pageSize: 1000 }), [query]);
  const { data: seriesList } = useAsync(() => api.listSeries(), []);
  const { data: settings } = useAsync(() => api.getSettings(), []);
  if (q !== get('q')) set({ q }, true);
  const low = settings?.lowStockThreshold ?? 2;
  const edit = can('products.edit');
  const summary = all ? { models: all.total, variants: all.items.reduce((s, p) => s + p.variants.length, 0), units: all.items.reduce((s, p) => s + p.variants.reduce((x, v) => x + v.stock, 0), 0), value: all.items.reduce((s, p) => s + p.variants.reduce((x, v) => x + v.stock * v.price, 0), 0), out: all.items.filter((p) => p.variants.every((v) => v.stock === 0)).length } : null;

  async function quick(p: AdminProduct, patch: Partial<AdminProduct>, msg: string) {
    try {
      await api.updateProduct(p.id, patch);
      toast.success(msg);
      reload();
    } catch (e) {
      toast.error('Could not update', e instanceof Error ? e.message : undefined);
    }
  }
  function onSort(key: string) {
    const map: Record<string, [Sort, Sort]> = { name: ['name', 'name'], price: ['price-asc', 'price-desc'], stock: ['stock', 'stock'], updated: ['updated', 'updated'], newest: ['newest', 'newest'] };
    const [a, b] = map[key];
    set({ sort: sort === a ? b : a });
  }
  const sortState = sort === 'name' ? { key: 'name', dir: 'asc' as const } : sort === 'price-asc' ? { key: 'price', dir: 'asc' as const } : sort === 'price-desc' ? { key: 'price', dir: 'desc' as const } : sort === 'stock' ? { key: 'stock', dir: 'asc' as const } : sort === 'updated' ? { key: 'updated', dir: 'desc' as const } : { key: 'newest', dir: 'desc' as const };

  const columns: Column<AdminProduct>[] = [
    { key: 'product', header: 'Product', sortKey: 'name', render: (p) => (
      <div className="flex items-center gap-3">
        <ProductThumb src={imageUrl(p.image)} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-bold">{p.brand} {p.name}{p.featured && <Star size={12} className="shrink-0 fill-amber-400 text-amber-400" />}</p>
          <p className="truncate text-[11px] text-ink-3">{p.series} · {p.releaseYear} · {p.storages.join(' / ')} · {p.networks.length} networks</p>
        </div>
      </div>
    ) },
    { key: 'status', header: 'Status', render: (p) => <ProductBadge status={p.status} /> },
    { key: 'stock', header: 'Stock by grade', sortKey: 'stock', render: (p) => <StockBar p={p} low={low} /> },
    { key: 'variants', header: 'Variants', align: 'right', hideBelow: 'lg', render: (p) => <span className="tabular"><b>{p.variants.length}</b> <span className="text-[11px] text-ink-3">· {p.variants.filter((v) => v.stock > 0).length} live</span></span> },
    { key: 'price', header: 'From', align: 'right', sortKey: 'price', render: (p) => {
      const prices = p.variants.filter((v) => v.stock > 0).map((v) => v.price);
      return (
        <div>
          <p className="font-semibold tabular">{money(p.fromPrice)}{prices.length > 1 && <span className="text-[11px] font-normal text-ink-3"> – {money(Math.max(...prices))}</span>}</p>
          <p className="text-[11px] text-ink-3 tabular">{savingsPct(p.fromPrice, p.rrp)}% off £{p.rrp}</p>
        </div>
      );
    } },
    { key: 'rating', header: 'Rating', align: 'right', hideBelow: 'xl', render: (p) => (p.reviewCount > 0 ? <span className="text-[12.5px] tabular"><span className="text-amber-500">★ </span>{p.rating.toFixed(1)} <span className="text-ink-3">({p.reviewCount})</span></span> : <span className="text-[11.5px] text-ink-4">No reviews</span>) },
    { key: 'updated', header: 'Updated', align: 'right', sortKey: 'updated', hideBelow: 'xl', render: (p) => <span className="text-[11.5px] text-ink-3">{timeAgo(p.updatedAt)}</span> },
    { key: 'actions', header: '', align: 'right', width: '44px', render: (p) => (
      <Menu
        trigger={<IconButton label="Actions"><MoreHorizontal size={16} /></IconButton>}
        items={[
          { label: edit ? 'Edit' : 'View', icon: edit ? <Pencil size={14} /> : <Eye size={14} />, onClick: () => navigate(`/products/${p.id}`) },
          { label: 'View on storefront', icon: <ExternalLink size={14} />, onClick: () => window.open(`${STOREFRONT_URL}/phones/${p.slug}`, '_blank') },
          ...(edit ? [
            { label: p.featured ? 'Remove from featured' : 'Add to featured', icon: <Star size={14} />, onClick: () => void quick(p, { featured: !p.featured }, p.featured ? 'Removed from home page rail' : 'Added to home page rail') },
            'divider' as const,
            ...(p.status !== 'active' ? [{ label: 'Set active', onClick: () => void quick(p, { status: 'active' as const }, 'Product is live') }] : []),
            ...(p.status !== 'draft' ? [{ label: 'Set draft', onClick: () => void quick(p, { status: 'draft' as const }, 'Product hidden as draft') }] : []),
            ...(p.status !== 'archived' ? [{ label: 'Archive', icon: <Archive size={14} />, onClick: () => void quick(p, { status: 'archived' as const }, 'Product archived'), danger: true }] : []),
          ] : []),
        ]}
      />
    ) },
  ];

  return (
    <div>
      <PageHeader eyebrow="Catalogue" title="Products" subtitle={data ? `${number(data.total)} ${status === 'all' ? 'models' : `${status} models`}` : ' '} actions={edit && <Button size="sm" to="/products/new"><Plus size={15} /> New product</Button>} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented value={status} onChange={(v) => set({ status: v })} options={[{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Drafts' }, { value: 'archived', label: 'Archived' }, { value: 'all', label: 'All' }]} />
        <Segmented value={brand || 'any'} onChange={(v) => set({ brand: v === 'any' ? '' : v, series: '' })} options={[{ value: 'any', label: 'All brands' }, { value: 'Apple', label: 'Apple' }, { value: 'Samsung', label: 'Samsung' }]} />
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search model or slug…" className="w-full md:w-72" />
          <Dropdown label="Series" value={series} onChange={(v) => set({ series: v })} options={(seriesList ?? []).filter((s) => !brand || s.brand === brand).map((s) => ({ value: s.series, label: s.series, count: s.count }))} />
          <Dropdown label="Stock" value={stock} onChange={(v) => set({ stock: v })} options={[{ value: 'in', label: 'In stock' }, { value: 'low', label: 'Has low stock' }, { value: 'out', label: 'Out of stock' }]} />
          <button onClick={() => set({ featured: featured ? '' : '1' })} className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors', featured ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:border-ink')}><Star size={13} /> Featured</button>
          <div className="ml-auto flex items-center gap-2">
            <Dropdown label="Sort" clearable={false} align="right" value={sort} onChange={(v) => v && set({ sort: v })} options={[{ value: 'newest', label: 'Newest release' }, { value: 'name', label: 'Name A–Z' }, { value: 'price-asc', label: 'Price low → high' }, { value: 'price-desc', label: 'Price high → low' }, { value: 'stock', label: 'Lowest stock' }, { value: 'updated', label: 'Recently updated' }]} />
            <DensityToggle />
          </div>
        </div>
        {summary && <SummaryBar items={[{ label: 'Models', value: number(summary.models) }, { label: 'Variants', value: number(summary.variants) }, { label: 'Units', value: number(summary.units) }, { label: 'Stock value', value: money(summary.value) }, { label: 'Fully out', value: number(summary.out) }]} />}
        <Table columns={columns} rows={data?.items ?? []} rowKey={(p) => p.id} loading={loading} sort={sortState} onSort={onSort} onRowClick={(p) => navigate(`/products/${p.id}`)} empty={<EmptyState icon={Smartphone} title="No products match" body="Try a different status, brand or search." action={<Button size="sm" variant="secondary" onClick={() => { setSearch(''); set({ q: '', series: '', stock: '', featured: '', brand: '', status: 'all' }); }}>Clear filters</Button>} />} />
        {data && data.total > 0 && (
          <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)}>
            <Dropdown clearable={false} value={String(pageSize)} onChange={(v) => set({ size: v })} options={[{ value: '25', label: '25 per page' }, { value: '50', label: '50 per page' }, { value: '100', label: '100 per page' }]} />
          </Pagination>
        )}
      </Card>
      <p className="mt-3 text-[11.5px] text-ink-4">Stock bar: <span className="text-success">■</span> Excellent <span className="text-info">■</span> Good <span className="text-warn">■</span> Fair. Low stock is {low} units or fewer per variant; change it in Settings → Catalogue.</p>
    </div>
  );
}
