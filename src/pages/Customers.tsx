import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Mail, Users } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryState } from '../hooks/useQueryState';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { Customer } from '../types';
import { Card, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dropdown } from '../components/ui/Dropdown';
import { Avatar, SearchInput, Segmented } from '../components/ui/Misc';
import { DensityToggle, Pagination, SummaryBar, Table, type Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, money, number, timeAgo } from '../lib/format';
import { downloadCsv } from '../lib/csv';

type Sort = 'recent' | 'spent' | 'orders' | 'name';

export default function Customers() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { get, getNum, set } = useQueryState();
  const [search, setSearch] = useState(get('q'));
  const q = useDebounce(search, 250);
  const seg = get('seg', 'all');
  const sort = (get('sort', 'recent') as Sort) || 'recent';
  const page = getNum('page', 1);
  const pageSize = getNum('size', 25);
  const query = useMemo(() => ({ search: q || undefined, subscribed: seg === 'subscribed' ? true : seg === 'unsubscribed' ? false : undefined, sort, page, pageSize }), [q, seg, sort, page, pageSize]);
  const { data, loading } = useAsync(() => api.listCustomers(query), [query]);
  const { data: all } = useAsync(() => api.listCustomers({ ...query, page: 1, pageSize: 10000 }), [query]);
  if (q !== get('q')) set({ q }, true);
  const summary = all ? { count: all.total, spent: all.items.reduce((s, c) => s + c.spent, 0), orders: all.items.reduce((s, c) => s + c.orders, 0), repeat: all.items.filter((c) => c.orders > 1).length } : null;

  async function exportCsv() {
    const items = all?.items ?? [];
    downloadCsv(`buyupon-customers-${new Date().toISOString().slice(0, 10)}.csv`, items.map((c) => ({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, city: c.city, postcode: c.postcode, orders: c.orders, spent: c.spent, firstOrder: c.firstOrderAt, lastOrder: c.lastOrderAt, newsletter: c.subscribed ? 'yes' : 'no' })));
    toast.success('CSV exported', `${items.length} customers`);
  }
  const sortState = { recent: { key: 'last', dir: 'desc' as const }, spent: { key: 'spent', dir: 'desc' as const }, orders: { key: 'orders', dir: 'desc' as const }, name: { key: 'name', dir: 'asc' as const } }[sort];
  const onSort = (key: string) => set({ sort: ({ last: 'recent', spent: 'spent', orders: 'orders', name: 'name' } as Record<string, Sort>)[key] });

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Customer', sortKey: 'name', render: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-bold">{c.firstName} {c.lastName}{c.orders > 1 && <Badge tone="lilac" className="ml-2">Repeat</Badge>}</p>
          <p className="truncate text-[11px] text-ink-3">{c.email} · {c.phone}</p>
        </div>
      </div>
    ) },
    { key: 'where', header: 'Location', hideBelow: 'md', render: (c) => <span className="text-[12.5px] text-ink-2">{c.city} <span className="text-ink-3">· {c.postcode}</span></span> },
    { key: 'orders', header: 'Orders', align: 'right', sortKey: 'orders', render: (c) => <span className="font-semibold tabular">{number(c.orders)}</span> },
    { key: 'spent', header: 'Lifetime value', align: 'right', sortKey: 'spent', render: (c) => <div><p className="font-semibold tabular">{money(c.spent)}</p><p className="text-[11px] text-ink-3 tabular">{money(c.orders ? c.spent / c.orders : 0)} avg</p></div> },
    { key: 'first', header: 'First order', align: 'right', hideBelow: 'lg', render: (c) => <span className="text-[11.5px] text-ink-3">{formatDate(c.firstOrderAt)}</span> },
    { key: 'last', header: 'Last order', align: 'right', sortKey: 'last', render: (c) => <span className="text-[11.5px] text-ink-3" title={formatDate(c.lastOrderAt)}>{timeAgo(c.lastOrderAt)}</span> },
    { key: 'news', header: 'Newsletter', hideBelow: 'lg', render: (c) => (c.subscribed ? <Badge tone="mint"><Mail size={11} /> Yes</Badge> : <span className="text-[11px] text-ink-4">—</span>) },
  ];

  return (
    <div>
      <PageHeader eyebrow="People" title="Customers" subtitle={data ? `${number(data.total)} customers, built from orders` : ' '} actions={can('orders.export') && <Button size="sm" variant="secondary" onClick={() => void exportCsv()}><Download size={15} /> Export CSV</Button>} />
      <div className="mb-3"><Segmented value={seg} onChange={(v) => set({ seg: v })} options={[{ value: 'all', label: 'All' }, { value: 'subscribed', label: 'On newsletter' }, { value: 'unsubscribed', label: 'Not subscribed' }]} /></div>
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Name, email, postcode…" className="w-full md:w-80" />
          <div className="ml-auto flex items-center gap-2">
            <Dropdown label="Sort" clearable={false} align="right" value={sort} onChange={(v) => v && set({ sort: v })} options={[{ value: 'recent', label: 'Most recent order' }, { value: 'spent', label: 'Highest lifetime value' }, { value: 'orders', label: 'Most orders' }, { value: 'name', label: 'Name A–Z' }]} />
            <DensityToggle />
          </div>
        </div>
        {summary && <SummaryBar items={[{ label: 'Customers', value: number(summary.count) }, { label: 'Repeat buyers', value: `${number(summary.repeat)} (${summary.count ? Math.round((summary.repeat / summary.count) * 100) : 0}%)` }, { label: 'Orders', value: number(summary.orders) }, { label: 'Total spent', value: money(summary.spent) }, { label: 'Avg per customer', value: money(summary.count ? summary.spent / summary.count : 0) }]} />}
        <Table columns={columns} rows={data?.items ?? []} rowKey={(c) => c.id} loading={loading} sort={sortState} onSort={onSort} onRowClick={(c) => navigate(`/customers/${encodeURIComponent(c.id)}`)} empty={<EmptyState icon={Users} title={q || seg !== 'all' ? 'No customers match' : 'No customers yet'} body={q || seg !== 'all' ? 'Try a different search or segment.' : 'Customers appear here once they have placed an order.'} />} />
        {data && data.total > 0 && <Pagination page={page} pageSize={pageSize} total={data.total} onPage={(p) => set({ page: p }, false)}><Dropdown clearable={false} value={String(pageSize)} onChange={(v) => set({ size: v })} options={[{ value: '25', label: '25 per page' }, { value: '50', label: '50 per page' }, { value: '100', label: '100 per page' }]} /></Pagination>}
      </Card>
    </div>
  );
}
