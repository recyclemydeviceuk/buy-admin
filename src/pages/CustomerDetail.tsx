import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Package, Phone, Star } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../store/toast';
import { useAuth } from '../store/auth';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, PageHeader, Stat } from '../components/ui/Card';
import { TextArea } from '../components/ui/Field';
import { Avatar, KeyValue, ProductThumb, Stars } from '../components/ui/Misc';
import { Badge, EnquiryBadge, OrderStatusBadge, ReviewBadge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDate, formatDateTime, imageUrl, money, number, timeAgo } from '../lib/format';

export default function CustomerDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { data, loading, setData } = useAsync(() => api.getCustomer(decodeURIComponent(id)), [id]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setNotes(data?.customer.notes ?? ''), [data?.customer.notes]);

  if (loading && !data) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (!data) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-xl font-bold">Customer not found</p>
        <Button className="mt-5" variant="secondary" size="sm" onClick={() => navigate('/customers')}><ArrowLeft size={14} /> Back to customers</Button>
      </div>
    );
  }
  const { customer: c, orders, reviews, enquiries } = data;
  const name = `${c.firstName} ${c.lastName}`;

  async function saveNotes() {
    setSaving(true);
    try {
      const updated = await api.updateCustomerNotes(c.id, notes);
      setData((d) => (d ? { ...d, customer: updated } : d));
      toast.success('Notes saved');
    } catch (e) {
      toast.error('Could not save notes', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        back={<Link to="/customers" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Customers</Link>}
        title={<span className="flex items-center gap-3"><Avatar name={name} size="lg" />{name}{c.subscribed && <Badge tone="mint"><Mail size={11} /> Newsletter</Badge>}</span>}
        subtitle={<>Customer since {formatDate(c.firstOrderAt)} · last order {timeAgo(c.lastOrderAt)}</>}
        actions={<><Button size="sm" variant="secondary" href={`mailto:${c.email}`}><Mail size={14} /> Email</Button><Button size="sm" variant="secondary" href={`tel:${c.phone}`}><Phone size={14} /> Call</Button></>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Orders" value={number(c.orders)} className="border border-line bg-white" />
        <Stat label="Lifetime value" value={money(c.spent)} sub="net of refunds" className="border border-line bg-white" />
        <Stat label="Average order" value={money(c.orders ? c.spent / c.orders : 0)} className="border border-line bg-white" />
        <Stat label="Reviews" value={number(reviews.length)} sub={reviews.length ? `avg ★ ${(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}` : undefined} className="border border-line bg-white" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card padded={false}>
            <CardHeader className="px-6 pb-0 pt-6" title="Orders" />
            <ul className="mt-3 divide-y divide-line-2">
              {orders.map((o) => (
                <li key={o.orderNumber}>
                  <Link to={`/orders/${o.orderNumber}`} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-cream-2">
                    <div className="flex -space-x-2">{o.lines.slice(0, 2).map((l) => <ProductThumb key={l.lineId} src={imageUrl(l.image)} size="sm" className="ring-2 ring-white" />)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{o.lines.map((l) => `${l.brand} ${l.name}`).join(', ')}</p>
                      <p className="text-xs text-ink-3"><span className="font-mono">{o.orderNumber}</span> · {formatDateTime(o.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                    <span className="w-16 text-right font-semibold tabular">{money(o.total)}</span>
                  </Link>
                </li>
              ))}
              {orders.length === 0 && <li className="px-6 py-8 text-center text-sm text-ink-3"><Package size={18} className="mx-auto mb-2" />No orders.</li>}
            </ul>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card padded={false}>
              <CardHeader className="px-6 pb-0 pt-6" title="Reviews" />
              <ul className="mt-3 divide-y divide-line-2">
                {reviews.map((r) => (
                  <li key={r.id} className="px-6 py-3.5">
                    <div className="flex items-center justify-between gap-2"><Stars rating={r.rating} /><ReviewBadge status={r.status} /></div>
                    <p className="mt-1.5 text-[13.5px] font-bold">{r.title}</p>
                    <p className="text-xs text-ink-3">{r.productName} · {formatDate(r.date)}</p>
                  </li>
                ))}
                {reviews.length === 0 && <li className="px-6 py-8 text-center text-sm text-ink-3"><Star size={18} className="mx-auto mb-2" />No reviews.</li>}
              </ul>
            </Card>
            <Card padded={false}>
              <CardHeader className="px-6 pb-0 pt-6" title="Enquiries" />
              <ul className="mt-3 divide-y divide-line-2">
                {enquiries.map((e) => (
                  <li key={e.id}>
                    <Link to={`/enquiries?open=${e.id}`} className="block px-6 py-3.5 hover:bg-cream-2">
                      <div className="flex items-center justify-between gap-2"><span className="text-xs text-ink-3">{formatDate(e.createdAt)}</span><EnquiryBadge status={e.status} /></div>
                      <p className="mt-1.5 line-clamp-2 text-[13px]">{e.message}</p>
                    </Link>
                  </li>
                ))}
                {enquiries.length === 0 && <li className="px-6 py-8 text-center text-sm text-ink-3"><MessageSquare size={18} className="mx-auto mb-2" />No enquiries.</li>}
              </ul>
            </Card>
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Contact" />
            <KeyValue items={[['Email', <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>], ['Phone', c.phone], ['City', c.city], ['Postcode', c.postcode]]} />
            <p className="mt-4 text-xs text-ink-3">Details come from the latest order. Edit them on the order itself.</p>
          </Card>
          <Card>
            <CardHeader title="Internal notes" subtitle="Only visible to admins." />
            <TextArea value={notes} disabled={!can('customers.edit')} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Prefers DPD, asked about trade-in…" />
            {can('customers.edit') && <Button size="sm" className="mt-3" variant="secondary" loading={saving} disabled={notes === (c.notes ?? '')} onClick={() => void saveNotes()}>Save notes</Button>}
          </Card>
        </div>
      </div>
    </div>
  );
}
