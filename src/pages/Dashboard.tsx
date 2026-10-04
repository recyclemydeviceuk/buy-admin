import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Boxes, Clock, Mail, MessageSquare, Package, PackageCheck, RotateCcw, Star, TrendingUp, Truck, Users } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useQueryState } from '../hooks/useQueryState';
import { useAuth } from '../store/auth';
import type { DashboardRange } from '../types';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Avatar, Delta, ProductThumb, Segmented, Stars } from '../components/ui/Misc';
import { ConditionBadge, OrderStatusBadge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Donut, HBars, Heatmap, RevenueChart, Sparkline } from '../components/charts/Charts';
import { conditionLabel, delta, formatDateTime, imageUrl, money, number, ORDER_STATUS_LABEL, timeAgo } from '../lib/format';
import { cn } from '../lib/cn';

function Kpi({ label, value, current, previous, sub, spark, invert, to }: { label: string; value: string; current?: number; previous?: number; sub?: string; spark?: number[]; invert?: boolean; to?: string }) {
  const d = current !== undefined && previous !== undefined ? delta(current, previous) : null;
  const inner = (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-3">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-display text-[26px] font-bold leading-none tracking-tightest tabular">{value}</p>
        {spark && <Sparkline values={spark} className="h-7 w-20 shrink-0" fill />}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11.5px] text-ink-3">
        {d !== null && <Delta value={d} invert={invert} />}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    </>
  );
  const cls = 'card p-4 transition-all';
  return to ? <Link to={to} className={cn(cls, 'hover:-translate-y-0.5 hover:shadow-card')}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const { get, set } = useQueryState();
  const range = (get('range', '30d') as DashboardRange) || '30d';
  const { data, loading } = useAsync(() => api.getDashboard(range), [range]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const rangeLabel = { '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days' }[range];

  if (loading && !data) {
    return (
      <div>
        <PageHeader title={<Skeleton className="h-8 w-72" />} />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-3xl" />)}</div>
        <Skeleton className="mt-5 h-80 rounded-3xl" />
      </div>
    );
  }
  if (!data) return null;

  const revSpark = data.series.map((s) => s.revenue);
  const ordSpark = data.series.map((s) => s.orders);
  const queue = [
    { label: 'Awaiting packing', value: data.fulfilment.awaiting, icon: Package, tone: data.fulfilment.awaiting ? 'lemon' : 'mint', to: '/orders?status=confirmed', sub: data.fulfilment.oldestOpenHours > 0 ? `oldest ${Math.round(data.fulfilment.oldestOpenHours)}h` : 'all clear' },
    { label: 'Being packed', value: data.fulfilment.packing, icon: PackageCheck, tone: 'lilac', to: '/orders?status=packing', sub: 'in progress' },
    { label: 'In transit', value: data.fulfilment.inTransit, icon: Truck, tone: 'sky', to: '/orders?status=dispatched', sub: data.fulfilment.overdue ? `${data.fulfilment.overdue} overdue` : 'on schedule' },
    { label: 'Low stock', value: data.stock.low, icon: Boxes, tone: 'lemon', to: '/inventory?stock=low', sub: 'variants' },
    { label: 'Out of stock', value: data.stock.out, icon: AlertTriangle, tone: 'peach', to: '/inventory?stock=out', sub: 'hidden on site' },
    { label: 'Reviews to moderate', value: data.pendingReviews, icon: Star, tone: 'lilac', to: '/reviews?status=pending', sub: `avg ★ ${data.avgRating.toFixed(1)}` },
    { label: 'Open enquiries', value: data.openEnquiries, icon: MessageSquare, tone: 'sky', to: '/enquiries?status=open', sub: 'need a reply' },
    { label: 'Subscribers', value: data.subscribers.current, icon: Mail, tone: 'mint', to: '/subscribers', sub: `+${data.subscribers.current - data.subscribers.previous} this period` },
  ];
  const tones: Record<string, string> = { lemon: 'bg-tint-lemon text-warn', mint: 'bg-tint-mint text-success', peach: 'bg-tint-peach text-brand-700', lilac: 'bg-tint-lilac text-violet', sky: 'bg-tint-sky text-info' };
  const totalOrders = Object.values(data.statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={<>{greeting}, <span className="serif-accent text-ink-3">{user?.name.split(' ')[0]}</span></>}
        subtitle={`${rangeLabel[0].toUpperCase()}${rangeLabel.slice(1)} against the ${data.days} days before. ${money(data.revenue.today)} and ${data.orders.today} ${data.orders.today === 1 ? 'order' : 'orders'} so far today.`}
        actions={<Segmented value={range} onChange={(v) => set({ range: v })} options={[{ value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '90 days' }]} />}
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Revenue" value={money(data.revenue.current)} current={data.revenue.current} previous={data.revenue.previous} sub={`vs ${money(data.revenue.previous)}`} spark={revSpark} />
        <Kpi label="Orders" value={number(data.orders.current)} current={data.orders.current} previous={data.orders.previous} sub={`vs ${number(data.orders.previous)}`} spark={ordSpark} to="/orders" />
        <Kpi label="Average order" value={money(data.aov.current)} current={data.aov.current} previous={data.aov.previous} sub={`vs ${money(data.aov.previous)}`} />
        <Kpi label="Units sold" value={number(data.units.current)} current={data.units.current} previous={data.units.previous} sub={`${data.salesByBrand.map((b) => `${b.key} ${b.units}`).join(' · ')}`} />
        <Kpi label="Refund rate" value={`${data.refunds.rate.toFixed(1)}%`} current={data.refunds.rate} previous={data.refunds.previousRate} invert sub={`${money(data.refunds.amount)} · ${data.refunds.count} ${data.refunds.count === 1 ? 'order' : 'orders'}`} />
        <Kpi label="Repeat customers" value={`${data.customers.repeatRate.toFixed(0)}%`} current={data.customers.repeatRate} previous={data.customers.previousRepeatRate} sub={`${data.customers.newCount} new · ${data.customers.returningCount} returning`} to="/customers" />
      </div>

      {/* Queue */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {queue.map(({ label, value, to, icon: Icon, tone, sub }) => (
          <Link key={label} to={to} className="card flex items-center gap-3 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:shadow-card">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tones[tone])}><Icon size={16} /></span>
            <span className="min-w-0">
              <span className="block font-display text-[17px] font-bold leading-none tabular">{number(value)}</span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-ink-2">{label}</span>
              <span className="block truncate text-[10.5px] text-ink-3">{sub}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Revenue chart + fulfilment */}
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Revenue and orders" subtitle={`Daily, ${rangeLabel}, with the previous period for comparison.`} />
          <RevenueChart data={data.series} previous={data.previousSeries} />
        </Card>
        <Card>
          <CardHeader title="Fulfilment" subtitle="How fast orders leave the building" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Time to dispatch</p>
              <p className="mt-1 font-display text-xl font-bold tabular">{data.fulfilment.avgHoursToDispatch.toFixed(1)}h</p>
              <div className="mt-1"><Delta value={delta(data.fulfilment.avgHoursToDispatch, data.fulfilment.previousAvgHoursToDispatch)} invert /></div>
            </div>
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Delivered on time</p>
              <p className="mt-1 font-display text-xl font-bold tabular">{data.fulfilment.onTimePct.toFixed(0)}%</p>
              <p className="mt-1 text-[11px] text-ink-3">of delivered orders</p>
            </div>
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Cancelled</p>
              <p className="mt-1 font-display text-xl font-bold tabular">{data.cancellations.rate.toFixed(1)}%</p>
              <p className="mt-1 text-[11px] text-ink-3">{data.cancellations.count} in range</p>
            </div>
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-3">Next-day share</p>
              <p className="mt-1 font-display text-xl font-bold tabular">{Math.round((data.deliverySplit['next-day'] / Math.max(1, data.deliverySplit['next-day'] + data.deliverySplit.standard)) * 100)}%</p>
              <p className="mt-1 text-[11px] text-ink-3">{data.deliverySplit['next-day']} next-day · {data.deliverySplit.standard} standard</p>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="eyebrow mb-3">Orders by status · all time</p>
            <Donut
              size={110}
              thickness={14}
              centre={{ value: number(totalOrders), label: 'orders' }}
              data={[
                { label: ORDER_STATUS_LABEL.delivered, value: data.statusCounts.delivered, color: '#127A4A' },
                { label: ORDER_STATUS_LABEL.dispatched, value: data.statusCounts.dispatched, color: '#1D5FB4' },
                { label: ORDER_STATUS_LABEL.packing, value: data.statusCounts.packing, color: '#5B3FA6' },
                { label: ORDER_STATUS_LABEL.confirmed, value: data.statusCounts.confirmed, color: '#8A5A00' },
                { label: 'Cancelled / returned', value: data.statusCounts.cancelled + data.statusCounts.returned, color: '#D01A2A' },
              ]}
            />
          </div>
        </Card>
      </div>

      {/* Sales mix */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader title="By grade" subtitle="Revenue in range" />
          <HBars data={data.salesByCondition.map((c) => ({ label: conditionLabel(c.key), value: c.revenue, sub: `${c.units} units` }))} format={money} showPct />
        </Card>
        <Card>
          <CardHeader title="By series" subtitle="Revenue in range" />
          <HBars data={data.salesBySeries.slice(0, 6).map((c) => ({ label: c.key, value: c.revenue, sub: `${c.units} units` }))} format={money} showPct color="#1D5FB4" />
        </Card>
        <Card>
          <CardHeader title="By network" subtitle="Revenue in range" />
          <HBars data={data.salesByNetwork.map((c) => ({ label: c.key, value: c.revenue, sub: `${c.units} units` }))} format={money} showPct color="#5B3FA6" />
        </Card>
        <Card>
          <CardHeader title="By storage" subtitle="Revenue in range" />
          <HBars data={data.salesByStorage.map((c) => ({ label: c.key, value: c.revenue, sub: `${c.units} units` }))} format={money} showPct color="#127A4A" />
        </Card>
      </div>

      {/* Tables */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <CardHeader className="px-5 pb-0 pt-5" title="Recent orders" actions={<Link to="/orders" className="inline-flex items-center gap-1 text-[12.5px] font-semibold hover:underline">All orders <ArrowRight size={13} /></Link>} />
          <table className="mt-2 w-full text-[12.5px]">
            <thead className="border-y border-line bg-cream-2/60 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">
              <tr><th className="px-5 py-2 text-left">Order</th><th className="px-3 py-2 text-left">Items</th><th className="hidden px-3 py-2 text-left md:table-cell">Customer</th><th className="px-3 py-2 text-left">Status</th><th className="px-5 py-2 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-line-2">
              {data.recentOrders.map((o) => (
                <tr key={o.orderNumber} className="hover:bg-cream-2">
                  <td className="px-5 py-2"><Link to={`/orders/${o.orderNumber}`} className="font-mono font-semibold hover:underline">{o.orderNumber}</Link><p className="text-[11px] text-ink-3">{timeAgo(o.createdAt)}</p></td>
                  <td className="px-3 py-2"><span className="flex items-center gap-2"><ProductThumb src={imageUrl(o.lines[0].image)} size="sm" /><span className="min-w-0"><span className="block truncate font-semibold">{o.lines[0].brand} {o.lines[0].name}{o.lines.length > 1 && <span className="text-ink-3"> +{o.lines.length - 1}</span>}</span><span className="block truncate text-[11px] text-ink-3">{o.lines[0].storage} · {o.lines[0].network} · {conditionLabel(o.lines[0].condition)}</span></span></span></td>
                  <td className="hidden px-3 py-2 md:table-cell"><span className="block truncate font-medium">{o.customer.firstName} {o.customer.lastName}</span><span className="block text-[11px] text-ink-3">{o.customer.city}</span></td>
                  <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-5 py-2 text-right font-semibold tabular">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card padded={false}>
          <CardHeader className="px-5 pb-0 pt-5" title="Top sellers" subtitle={`By revenue, ${rangeLabel}`} />
          <ul className="mt-2 divide-y divide-line-2">
            {data.topProducts.map((p, i) => (
              <li key={p.productId}>
                <Link to={`/products/${p.productId}`} className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-cream-2">
                  <span className="w-4 text-center text-[11px] font-bold text-ink-4 tabular">{i + 1}</span>
                  <ProductThumb src={imageUrl(p.image)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold">{p.brand} {p.name}</span>
                    <span className="block text-[11px] text-ink-3">{p.units} sold · {p.stock} in stock</span>
                  </span>
                  <span className="text-[12.5px] font-semibold tabular">{money(p.revenue)}</span>
                </Link>
              </li>
            ))}
            {data.topProducts.length === 0 && <li className="px-5 py-6 text-center text-xs text-ink-3">No sales in this range.</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card padded={false}>
          <CardHeader className="px-5 pb-0 pt-5" title="Needs restock" subtitle="Sold in range and now at or below the low-stock line" actions={<Link to="/inventory?stock=low" className="text-[12.5px] font-semibold hover:underline">Inventory</Link>} />
          <ul className="mt-2 divide-y divide-line-2">
            {data.restock.map((r) => (
              <li key={`${r.productId}${r.storage}${r.network}${r.condition}`} className="flex items-center gap-3 px-5 py-2">
                <ProductThumb src={imageUrl(r.image)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold">{r.brand} {r.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-ink-3">{r.storage} · {r.network} · <ConditionBadge condition={r.condition} /></span>
                </span>
                <span className="text-right">
                  <span className={cn('block text-[12.5px] font-bold tabular', r.stock === 0 ? 'text-brand-700' : 'text-warn')}>{r.stock} left</span>
                  <span className="block text-[11px] text-ink-3">{r.soldInRange} sold</span>
                </span>
              </li>
            ))}
            {data.restock.length === 0 && <li className="px-5 py-6 text-center text-xs text-ink-3">Nothing urgent. Stock covers what is selling.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title="When customers buy" subtitle={`Orders by weekday and hour, ${rangeLabel}`} />
          <Heatmap grid={data.heatmap} />
          <div className="mt-5 border-t border-line pt-4">
            <p className="eyebrow mb-3">Top cities</p>
            <HBars data={data.cities.map((c) => ({ label: c.key, value: c.revenue, sub: `${c.orders} orders` }))} format={money} />
          </div>
        </Card>
        <div className="space-y-4">
          <Card padded={false}>
            <CardHeader className="px-5 pb-0 pt-5" title="Best customers" subtitle={rangeLabel} />
            <ul className="mt-2 divide-y divide-line-2">
              {data.topCustomers.map((c) => (
                <li key={c.id}>
                  <Link to={`/customers/${encodeURIComponent(c.id)}`} className="flex items-center gap-3 px-5 py-2 hover:bg-cream-2">
                    <Avatar name={c.name} size="sm" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-bold">{c.name}</span><span className="block truncate text-[11px] text-ink-3">{c.orders} {c.orders === 1 ? 'order' : 'orders'}</span></span>
                    <span className="text-[12.5px] font-semibold tabular">{money(c.spent)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Stock on hand" subtitle={`${number(data.stock.units)} units · ${money(data.stock.value)} at sale price`} />
            <HBars data={(['excellent', 'good', 'fair'] as const).map((c) => ({ label: conditionLabel(c), value: data.stockByCondition[c].units, sub: money(data.stockByCondition[c].value) }))} format={(n) => `${number(n)} units`} />
          </Card>
        </div>
      </div>

      {/* Inbox + activity */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card padded={false}>
          <CardHeader className="px-5 pb-0 pt-5" title="Reviews waiting" actions={<Link to="/reviews?status=pending" className="text-[12.5px] font-semibold hover:underline">Moderate</Link>} />
          <ul className="mt-2 divide-y divide-line-2">
            {data.pendingReviewList.map((r) => (
              <li key={r.id} className="px-5 py-2.5">
                <div className="flex items-center justify-between gap-2"><Stars rating={r.rating} size={12} /><span className="text-[11px] text-ink-3">{timeAgo(r.date)}</span></div>
                <p className="mt-1 truncate text-[12.5px] font-bold">{r.title}</p>
                <p className="truncate text-[11px] text-ink-3">{r.author} on {r.productName}</p>
              </li>
            ))}
            {data.pendingReviewList.length === 0 && <li className="px-5 py-6 text-center text-xs text-ink-3">Nothing to moderate.</li>}
          </ul>
        </Card>
        <Card padded={false}>
          <CardHeader className="px-5 pb-0 pt-5" title="Open enquiries" actions={<Link to="/enquiries?status=open" className="text-[12.5px] font-semibold hover:underline">Inbox</Link>} />
          <ul className="mt-2 divide-y divide-line-2">
            {data.openEnquiryList.map((e) => (
              <li key={e.id}>
                <Link to={`/enquiries?open=${e.id}`} className="block px-5 py-2.5 hover:bg-cream-2">
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-[12.5px] font-bold">{e.name}</span><span className="text-[11px] text-ink-3">{timeAgo(e.createdAt)}</span></div>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-2">{e.message}</p>
                </Link>
              </li>
            ))}
            {data.openEnquiryList.length === 0 && <li className="px-5 py-6 text-center text-xs text-ink-3">Inbox zero.</li>}
          </ul>
        </Card>
        <Card padded={false}>
          <CardHeader className="px-5 pb-0 pt-5" title="Team activity" actions={can('activity.view') && <Link to="/activity" className="text-[12.5px] font-semibold hover:underline">Log</Link>} />
          <ul className="mt-2 divide-y divide-line-2">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-2.5 px-5 py-2">
                <Avatar name={a.actor} size="sm" className="mt-0.5" />
                <span className="min-w-0 flex-1 text-[12px]"><b>{a.actor}</b> <span className="text-ink-2">{a.action.toLowerCase()}</span>{a.target && <span className="font-semibold"> · {a.target}</span>}<span className="block text-[11px] text-ink-3">{timeAgo(a.at)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-5 flex items-center justify-end gap-1.5 text-[11px] text-ink-4"><Clock size={11} /> Updated {formatDateTime(new Date().toISOString())}</p>
    </div>
  );
}

export { TrendingUp, RotateCcw, Users };
