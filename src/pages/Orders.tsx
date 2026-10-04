import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, Download, Flag, Package, PackageCheck, Truck } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { AdminOrder, OrderStatus, PaymentStatus } from '../types';
import { Card, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Checkbox, Field } from '../components/ui/Field';
import { Dropdown } from '../components/ui/Dropdown';
import { FilterButton, ProductThumb, SearchInput, Segmented } from '../components/ui/Misc';
import { DensityToggle, Pagination, SummaryBar, Table, type Column } from '../components/ui/Table';
import { Badge, OrderStatusBadge, PaymentBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { conditionLabel, formatDate, formatDateTime, imageUrl, money, number, ORDER_STATUS_LABEL, ORDER_STATUS_ORDER, timeAgo } from '../lib/format';
import { addDays, dayKey, startOfDay } from '../lib/dates';
import { downloadCsv } from '../lib/csv';
import { cn } from '../lib/cn';

type Tab = 'all' | 'open' | OrderStatus;
type Sort = 'newest' | 'oldest' | 'total-desc' | 'total-asc';

const DATE_PRESETS: Array<{ value: string; label: string; range: () => [string, string] }> = [
  { value: 'today', label: 'Today', range: () => [dayKey(new Date()), dayKey(new Date())] },
  { value: 'yesterday', label: 'Yesterday', range: () => [dayKey(addDays(new Date(), -1)), dayKey(addDays(new Date(), -1))] },
  { value: '7d', label: 'Last 7 days', range: () => [dayKey(addDays(new Date(), -6)), dayKey(new Date())] },
  { value: '30d', label: 'Last 30 days', range: () => [dayKey(addDays(new Date(), -29)), dayKey(new Date())] },
  { value: 'month', label: 'This month', range: () => [dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), dayKey(new Date())] },
];

export default function Orders() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const tab = (get('status', 'all') as Tab) || 'all';
  const payment = get('payment') as PaymentStatus | '';
  const delivery = get('delivery');
  const flagged = get('flagged') === '1';
  const from = get('from');
  const to = get('to');
  const sort = (get('sort', 'newest') as Sort) || 'newest';
  const page = getNum('page', 1);
  const pageSize = getNum('size', 25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<'packing' | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => ({ search: q || undefined, status: tab, paymentStatus: payment || undefined, delivery: (delivery || undefined) as 'standard' | 'next-day' | undefined, flagged: flagged || undefined, from: from || undefined, to: to || undefined, sort, page, pageSize }), [q, tab, payment, delivery, flagged, from, to, sort, page, pageSize]);
  const { data, loading, reload } = useAsync(() => api.listOrders(query), [query]);
  const { data: all } = useAsync(() => api.listOrders({ ...query, page: 1, pageSize: 10000 }), [query]);
  if (q !== get('q')) set({ q }, true);

  const filtersActive = !!(payment || delivery || flagged || from || to || q);
  const rows = data?.items ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.orderNumber));
  const datePreset = DATE_PRESETS.find((p) => { const [a, b] = p.range(); return a === from && b === to; })?.value ?? (from || to ? 'custom' : '');
  const summary = all ? { count: all.total, revenue: all.items.reduce((s, o) => s + (o.status === 'cancelled' ? 0 : o.total - o.refundedAmount), 0), units: all.items.reduce((s, o) => s + o.lines.reduce((x, l) => x + l.quantity, 0), 0), refunded: all.items.reduce((s, o) => s + o.refundedAmount, 0) } : null;

  function onSort(key: string) {
    if (key === 'placed') set({ sort: sort === 'newest' ? 'oldest' : 'newest' });
    if (key === 'total') set({ sort: sort === 'total-desc' ? 'total-asc' : 'total-desc' });
  }
  const sortState = sort === 'newest' ? { key: 'placed', dir: 'desc' as const } : sort === 'oldest' ? { key: 'placed', dir: 'asc' as const } : sort === 'total-desc' ? { key: 'total', dir: 'desc' as const } : { key: 'total', dir: 'asc' as const };

  async function bulkPacking() {
    setBusy(true);
    const targets = rows.filter((r) => selected.has(r.orderNumber) && r.status === 'confirmed');
    for (const o of targets) await api.changeOrderStatus(o.orderNumber, { status: 'packing' });
    setBusy(false);
    setBulk(null);
    setSelected(new Set());
    toast.success(`${targets.length} ${targets.length === 1 ? 'order' : 'orders'} moved to packing`);
    reload();
  }
  async function bulkFlag(flag: boolean) {
    setBusy(true);
    const targets = rows.filter((r) => selected.has(r.orderNumber) && r.flagged !== flag);
    for (const o of targets) await api.flagOrder(o.orderNumber, flag);
    setBusy(false);
    setSelected(new Set());
    toast.success(`${targets.length} ${targets.length === 1 ? 'order' : 'orders'} ${flag ? 'flagged' : 'unflagged'}`);
    reload();
  }
  function toCsvRows(items: AdminOrder[]) {
    return items.map((o) => ({
      order: o.orderNumber, placed: o.createdAt, status: o.status, payment: o.paymentStatus, paymentRef: o.paymentRef, customer: `${o.customer.firstName} ${o.customer.lastName}`, email: o.customer.email, phone: o.customer.phone,
      address: [o.customer.line1, o.customer.line2, o.customer.city, o.customer.postcode].filter(Boolean).join(', '), delivery: o.delivery, items: o.lines.map((l) => `${l.brand} ${l.name} ${l.storage} ${l.network} ${l.condition} x${l.quantity}`).join(' | '),
      subtotal: o.subtotal, deliveryFee: o.deliveryFee, total: o.total, refunded: o.refundedAmount, tracking: o.tracking ? `${o.tracking.carrier} ${o.tracking.number}` : '', flagged: o.flagged ? 'yes' : '',
    }));
  }
  async function exportCsv(onlySelected = false) {
    const items = onlySelected ? rows.filter((r) => selected.has(r.orderNumber)) : (all?.items ?? (await api.listOrders({ ...query, page: 1, pageSize: 10000 })).items);
    downloadCsv(`buyupon-orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsvRows(items));
    toast.success('CSV exported', `${items.length} orders`);
  }

  const now = Date.now();
  const columns: Column<AdminOrder>[] = [
    ...(can('orders.manage') ? [{ key: 'sel', header: <Checkbox checked={allSelected} indeterminate={!allSelected && rows.some((r) => selected.has(r.orderNumber))} onChange={(v: boolean) => setSelected(v ? new Set(rows.map((r) => r.orderNumber)) : new Set())} />, width: '36px', render: (o: AdminOrder) => <Checkbox checked={selected.has(o.orderNumber)} onChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(o.orderNumber) : n.delete(o.orderNumber); return n; })} /> }] : []),
    { key: 'order', header: 'Order', sortKey: 'placed', render: (o) => (
      <div className="flex items-center gap-2">
        {o.flagged && <Flag size={12} className="shrink-0 fill-brand-600 text-brand-600" />}
        <div>
          <p className="whitespace-nowrap font-mono text-[12.5px] font-semibold">{o.orderNumber}</p>
          <p className="whitespace-nowrap text-[11px] text-ink-3" title={formatDateTime(o.createdAt)}>{formatDate(o.createdAt, { day: 'numeric', month: 'short' })} · {new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {timeAgo(o.createdAt)}</p>
        </div>
      </div>
    ) },
    { key: 'customer', header: 'Customer', render: (o) => (
      <div className="min-w-0">
        <p className="truncate font-semibold">{o.customer.firstName} {o.customer.lastName}</p>
        <p className="truncate text-[11px] text-ink-3">{o.customer.city} · {o.customer.postcode}</p>
      </div>
    ) },
    { key: 'items', header: 'Items', render: (o) => (
      <div className="flex items-center gap-2.5">
        <div className="flex -space-x-2">{o.lines.slice(0, 3).map((l) => <ProductThumb key={l.lineId} src={imageUrl(l.image)} size="sm" className="ring-2 ring-white" />)}</div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{o.lines[0].brand} {o.lines[0].name}{o.lines.length > 1 && <span className="text-ink-3"> +{o.lines.length - 1} more</span>}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-ink-3"><span className="rounded bg-cream px-1 font-semibold text-ink-2">{o.lines[0].storage}</span>{o.lines[0].network} · {conditionLabel(o.lines[0].condition)}{o.lines.reduce((s, l) => s + l.quantity, 0) > 1 && ` · ${o.lines.reduce((s, l) => s + l.quantity, 0)} units`}</p>
        </div>
      </div>
    ) },
    { key: 'status', header: 'Status', render: (o) => <OrderStatusBadge status={o.status} /> },
    { key: 'payment', header: 'Payment', hideBelow: 'md', render: (o) => <div><PaymentBadge status={o.paymentStatus} />{o.refundedAmount > 0 && <p className="mt-0.5 text-[11px] text-brand-700 tabular">−{money(o.refundedAmount)}</p>}</div> },
    { key: 'delivery', header: 'Delivery', hideBelow: 'lg', render: (o) => {
      const due = new Date(o.estimatedDelivery).getTime();
      const closed = o.status === 'cancelled' || o.status === 'returned' || o.status === 'delivered';
      const late = !closed && due + 86_400_000 < now;
      return (
        <div className="text-[12px]">
          <p className="flex items-center gap-1.5 font-medium text-ink-2">{o.delivery === 'next-day' ? <Truck size={13} /> : <Package size={13} />}{o.delivery === 'next-day' ? 'Next-day' : 'Standard'}{o.tracking && <span className="truncate font-mono text-[10.5px] text-ink-3" title={`${o.tracking.carrier} ${o.tracking.number}`}>· {o.tracking.number}</span>}</p>
          <p className={cn('text-[11px]', late ? 'font-semibold text-brand-700' : 'text-ink-3')}>{closed ? (o.status === 'delivered' ? 'Delivered' : '—') : <>{late && <AlertCircle size={11} className="mr-0.5 inline" />}Due {formatDate(o.estimatedDelivery, { weekday: 'short', day: 'numeric', month: 'short' })}</>}</p>
        </div>
      );
    } },
    { key: 'total', header: 'Total', align: 'right', sortKey: 'total', render: (o) => <span className="font-semibold tabular">{money(o.total)}</span> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Fulfilment"
        title="Orders"
        subtitle={data ? `${number(data.total)} ${tab === 'all' ? 'orders' : tab === 'open' ? 'orders to fulfil' : ORDER_STATUS_LABEL[tab as OrderStatus].toLowerCase() + ' orders'}${filtersActive ? ' matching filters' : ''}` : ' '}
        actions={can('orders.export') && <Button variant="secondary" size="sm" onClick={() => void exportCsv()}><Download size={15} /> Export CSV</Button>}
      />

      <div className="mb-3">
        <Segmented value={tab} onChange={(v) => set({ status: v })} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'To fulfil' }, ...ORDER_STATUS_ORDER.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] }))]} />
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Order no., customer, email, postcode, tracking…" className="w-full md:w-72" />
          <Dropdown label="Payment" value={payment} onChange={(v) => set({ payment: v })} options={[{ value: 'paid', label: 'Paid' }, { value: 'partially-refunded', label: 'Part refunded' }, { value: 'refunded', label: 'Refunded' }]} />
          <Dropdown label="Delivery" value={delivery} onChange={(v) => set({ delivery: v })} options={[{ value: 'next-day', label: 'Next-day tracked', icon: <Truck size={14} /> }, { value: 'standard', label: 'Standard tracked', icon: <Package size={14} /> }]} />
          <Dropdown label="Date" value={datePreset} placeholder="Any time" onChange={(v) => { const p = DATE_PRESETS.find((x) => x.value === v); if (p) { const [a, b] = p.range(); set({ from: a, to: b }); } else if (!v) set({ from: '', to: '' }); }} options={[...DATE_PRESETS.map((p) => ({ value: p.value, label: p.label })), ...(datePreset === 'custom' ? [{ value: 'custom', label: `${from || '…'} → ${to || '…'}` }] : [])]} />
          <FilterButton label="Custom range" active={datePreset === 'custom'} onClear={() => set({ from: '', to: '' })}>
            <div className="grid w-64 gap-2"><Field size="sm" label="From" type="date" value={from} onChange={(e) => set({ from: e.target.value })} /><Field size="sm" label="To" type="date" value={to} onChange={(e) => set({ to: e.target.value })} /></div>
          </FilterButton>
          <button onClick={() => set({ flagged: flagged ? '' : '1' })} className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors', flagged ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:border-ink')}><Flag size={13} /> Flagged</button>
          {filtersActive && <Button size="xs" variant="ghost" onClick={() => { setSearch(''); set({ q: '', payment: '', delivery: '', from: '', to: '', flagged: '' }); }}>Clear</Button>}
          <div className="ml-auto flex items-center gap-2">
            <Dropdown label="Sort" clearable={false} value={sort} onChange={(v) => v && set({ sort: v })} align="right" options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'total-desc', label: 'Highest value' }, { value: 'total-asc', label: 'Lowest value' }]} />
            <DensityToggle />
          </div>
        </div>

        {summary && <SummaryBar items={[{ label: 'Orders', value: number(summary.count) }, { label: 'Revenue', value: money(summary.revenue) }, { label: 'Units', value: number(summary.units) }, { label: 'Avg order', value: money(summary.count ? summary.revenue / summary.count : 0) }, ...(summary.refunded ? [{ label: 'Refunded', value: money(summary.refunded) }] : [])]} />}

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-tint-sky/40 px-4 py-2 text-[12.5px]">
            <b>{selected.size} selected</b>
            <Button size="xs" onClick={() => setBulk('packing')}><PackageCheck size={13} /> Move to packing</Button>
            <Button size="xs" variant="secondary" onClick={() => void bulkFlag(true)}><Flag size={13} /> Flag</Button>
            <Button size="xs" variant="secondary" onClick={() => void bulkFlag(false)}>Unflag</Button>
            {can('orders.export') && <Button size="xs" variant="secondary" onClick={() => void exportCsv(true)}><Download size={13} /> Export selected</Button>}
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        <Table
          columns={columns}
          rows={rows}
          rowKey={(o) => o.orderNumber}
          loading={loading}
          selected={selected}
          sort={sortState}
          onSort={onSort}
          onRowClick={(o) => navigate(`/orders/${o.orderNumber}`)}
          rowClassName={(o) => (o.flagged ? 'bg-brand-50/30' : undefined)}
          empty={<EmptyState icon={Package} title={filtersActive ? 'No orders match' : 'No orders yet'} body={filtersActive ? 'Try clearing the search or filters.' : 'Orders placed on the storefront will appear here.'} action={filtersActive && <Button size="sm" variant="secondary" onClick={() => { setSearch(''); set({ q: '', payment: '', delivery: '', from: '', to: '', flagged: '', status: 'all' }); }}>Clear filters</Button>} />}
        />
        {data && data.total > 0 && (
          <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)}>
            <Dropdown size="sm" clearable={false} value={String(pageSize)} onChange={(v) => set({ size: v })} options={[{ value: '25', label: '25 per page' }, { value: '50', label: '50 per page' }, { value: '100', label: '100 per page' }]} />
          </Pagination>
        )}
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-4"><Calendar size={11} /> Due dates are the estimate given at checkout. <Badge tone="peach" className="ml-1">Late</Badge> means a day past the estimate without delivery.</p>

      <ConfirmDialog open={bulk === 'packing'} onClose={() => setBulk(null)} onConfirm={() => void bulkPacking()} loading={busy} title="Move to packing" confirmLabel="Move orders" body={<>Confirmed orders in your selection will be marked as <b>Packing</b>. Orders in other statuses are skipped.</>} />
    </div>
  );
}

export { startOfDay };
