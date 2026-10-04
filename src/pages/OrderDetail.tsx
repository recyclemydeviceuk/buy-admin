import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, ExternalLink, Flag, Mail, MapPin, MessageSquare, Package, Pencil, Printer, RotateCcw, Truck, Clock } from 'lucide-react';
import { api } from '../api';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import type { AdminOrder, OrderStatus, StatusChange } from '../types';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Badge, ConditionBadge, OrderStatusBadge, PaymentBadge, ORDER_TONE } from '../components/ui/Badge';
import { Field, TextArea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { KeyValue, Menu, ProductThumb } from '../components/ui/Misc';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusModal, trackingUrl } from '../components/orders/StatusModal';
import { DELIVERY_LABEL, formatDate, formatDateTime, imageUrl, money, moneyExact, NEXT_STATUSES, ORDER_STATUS_LABEL, STOREFRONT_URL } from '../lib/format';
import { cn } from '../lib/cn';

const EVENT_ICON = { created: Check, status: Package, note: MessageSquare, payment: CreditCard, email: Mail, tracking: Truck };
const EVENT_TONE = { created: 'bg-tint-mint text-success', status: 'bg-ink text-white', note: 'bg-tint-lemon text-warn', payment: 'bg-tint-lilac text-violet', email: 'bg-tint-sky text-info', tracking: 'bg-tint-sky text-info' };
const STAGES: OrderStatus[] = ['confirmed', 'packing', 'dispatched', 'delivered'];

export default function OrderDetail() {
  const { orderNumber = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const { data: order, loading, setData } = useAsync(() => api.getOrder(orderNumber), [orderNumber]);
  const [statusTarget, setStatusTarget] = useState<OrderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState<{ amount: string; reason: string } | null>(null);
  const [tracking, setTracking] = useState<{ carrier: string; number: string } | null>(null);
  const [editing, setEditing] = useState<AdminOrder['customer'] | null>(null);

  async function run(label: string, fn: () => Promise<AdminOrder>) {
    setBusy(true);
    try {
      const next = await fn();
      setData(next);
      toast.success(label);
      return true;
    } catch (e) {
      toast.error('Something went wrong', e instanceof Error ? e.message : undefined);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(change: StatusChange) {
    if (!order) return;
    const ok = await run(`Order marked ${ORDER_STATUS_LABEL[change.status].toLowerCase()}`, () => api.changeOrderStatus(order.orderNumber, change));
    if (ok) setStatusTarget(null);
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!order || !note.trim()) return;
    const ok = await run('Note added', () => api.addOrderNote(order.orderNumber, note.trim()));
    if (ok) setNote('');
  }

  if (loading && !order) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><div className="grid gap-5 xl:grid-cols-3"><Skeleton className="h-96 rounded-3xl xl:col-span-2" /><Skeleton className="h-96 rounded-3xl" /></div></div>;
  }
  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-xl font-bold">Order not found</p>
        <p className="mt-1 text-sm text-ink-3">No order with the number <span className="font-mono">{orderNumber}</span>.</p>
        <Button className="mt-5" variant="secondary" size="sm" onClick={() => navigate('/orders')}><ArrowLeft size={14} /> Back to orders</Button>
      </div>
    );
  }

  const manage = can('orders.manage');
  const stageIndex = STAGES.indexOf(order.status);
  const closed = order.status === 'cancelled' || order.status === 'returned';
  const next = NEXT_STATUSES[order.status];
  const primaryNext = next.find((s) => s !== 'cancelled' && s !== 'returned' && s !== 'confirmed');
  const remaining = order.total - order.refundedAmount;
  const units = order.lines.reduce((s, l) => s + l.quantity, 0);
  const addressLines = [order.customer.line1, order.customer.line2, order.customer.city, order.customer.postcode].filter(Boolean);

  return (
    <div>
      <PageHeader
        back={<Link to="/orders" className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 hover:text-ink"><ArrowLeft size={14} /> Orders</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="font-mono">{order.orderNumber}</span><OrderStatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} />{order.flagged && <Badge tone="brand"><Flag size={11} /> Flagged</Badge>}</span>}
        subtitle={<>Placed {formatDateTime(order.createdAt)} · {units} {units === 1 ? 'item' : 'items'} · {DELIVERY_LABEL[order.delivery]} · {closed ? 'No delivery' : `Due ${formatDate(order.estimatedDelivery, { weekday: 'short', day: 'numeric', month: 'short' })}`}</>}
        actions={
          <>
            {manage && primaryNext && <Button size="sm" onClick={() => setStatusTarget(primaryNext)}>{primaryNext === 'dispatched' ? <Truck size={15} /> : primaryNext === 'delivered' ? <Check size={15} /> : <Package size={15} />} Mark {ORDER_STATUS_LABEL[primaryNext].toLowerCase()}</Button>}
            <Menu
              trigger={<Button size="sm" variant="secondary">More</Button>}
              items={[
                ...next.filter((s) => s !== primaryNext).filter((s) => (s === 'cancelled' || s === 'returned' ? can('orders.refund') : manage)).map((s) => ({ label: `Mark ${ORDER_STATUS_LABEL[s].toLowerCase()}`, icon: s === 'cancelled' || s === 'returned' ? <RotateCcw size={14} /> : <Package size={14} />, onClick: () => setStatusTarget(s), danger: s === 'cancelled' || s === 'returned' })),
                ...(manage ? [
                  { label: order.tracking ? 'Edit tracking' : 'Add tracking', icon: <Truck size={14} />, onClick: () => setTracking({ carrier: order.tracking?.carrier ?? 'Royal Mail Tracked 24', number: order.tracking?.number ?? '' }) },
                  { label: order.flagged ? 'Remove flag' : 'Flag for attention', icon: <Flag size={14} />, onClick: () => void run(order.flagged ? 'Flag removed' : 'Order flagged', () => api.flagOrder(order.orderNumber, !order.flagged)) },
                  'divider' as const,
                  { label: 'Re-send confirmation email', icon: <Mail size={14} />, onClick: () => void run('Confirmation email sent', () => api.resendOrderEmail(order.orderNumber, 'confirmation')) },
                  { label: 'Send VAT invoice', icon: <Mail size={14} />, onClick: () => void run('Invoice email sent', () => api.resendOrderEmail(order.orderNumber, 'invoice')) },
                ] : []),
                { label: 'Print packing slip', icon: <Printer size={14} />, onClick: () => window.print() },
                ...(can('orders.refund') ? ['divider' as const, { label: 'Refund…', icon: <CreditCard size={14} />, onClick: () => setRefund({ amount: String(remaining), reason: '' }), disabled: remaining <= 0 }] : []),
              ]}
            />
          </>
        }
      />

      {!closed && (
        <ol className="mb-6 grid grid-cols-4 gap-2 rounded-3xl border border-line bg-white p-4">
          {STAGES.map((s, i) => {
            const done = i <= stageIndex;
            const at = order.events.find((e) => e.type === 'status' && e.message.toLowerCase().startsWith(ORDER_STATUS_LABEL[s].toLowerCase()))?.at ?? (s === 'confirmed' ? order.createdAt : undefined);
            return (
              <li key={s} className="min-w-0">
                <div className={cn('h-1 rounded-full', done ? 'bg-success' : 'bg-line')} />
                <p className={cn('mt-2.5 truncate text-[12.5px] font-bold', done ? 'text-ink' : 'text-ink-3')}>{ORDER_STATUS_LABEL[s]}</p>
                <p className="truncate text-[11px] text-ink-3">{done && at ? formatDateTime(at) : i === stageIndex + 1 ? 'Next' : ''}</p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="print-only mb-8">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div><p className="font-display text-2xl font-bold">Packing slip</p><p className="font-mono text-sm">{order.orderNumber}</p><p className="text-xs text-ink-3">Placed {formatDateTime(order.createdAt)} · {DELIVERY_LABEL[order.delivery]}</p></div>
          <div className="text-right text-sm"><p className="font-bold">CashMyMobile</p><p className="text-xs text-ink-3">support@cashmymobile.co.uk</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
          <div><p className="eyebrow mb-1">Deliver to</p><p className="font-bold">{order.customer.firstName} {order.customer.lastName}</p>{addressLines.map((l) => <p key={l}>{l}</p>)}<p className="mt-1 text-xs text-ink-3">{order.customer.phone}</p></div>
          <div><p className="eyebrow mb-1">Contents</p><ul className="space-y-1">{order.lines.map((l) => <li key={l.lineId}>{l.quantity} × {l.brand} {l.name} · {l.storage} · {l.network} · {l.condition}</li>)}</ul><p className="mt-2 text-xs text-ink-3">Check IMEI, battery health and grade before sealing.</p></div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card padded={false}>
            <CardHeader className="px-6 pb-0 pt-6" title="Items" subtitle={`${units} ${units === 1 ? 'device' : 'devices'}`} />
            <ul className="mt-3 divide-y divide-line-2">
              {order.lines.map((l) => (
                <li key={l.lineId} className="flex items-center gap-4 px-6 py-4">
                  <ProductThumb src={imageUrl(l.image)} size="lg" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${l.productId}`} className="block truncate text-[15px] font-bold hover:underline">{l.brand} {l.name}</Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                      <span>{l.storage}</span><span>·</span><span>{l.network}</span><span>·</span><ConditionBadge condition={l.condition} />
                    </p>
                    <a href={`${STOREFRONT_URL}/phones/${l.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-3 hover:text-ink">View on storefront <ExternalLink size={11} /></a>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{money(l.unitPrice * l.quantity)}</p>
                    <p className="text-xs text-ink-3">{l.quantity} × {money(l.unitPrice)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-6 py-4">
              <dl className="ml-auto max-w-xs space-y-1.5 text-[13.5px]">
                <div className="flex justify-between"><dt className="text-ink-3">Subtotal</dt><dd className="tabular">{moneyExact(order.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-3">{DELIVERY_LABEL[order.delivery]}</dt><dd className="tabular">{order.deliveryFee ? moneyExact(order.deliveryFee) : <span className="font-semibold text-success">Free</span>}</dd></div>
                {order.refundedAmount > 0 && <div className="flex justify-between text-brand-700"><dt>Refunded</dt><dd className="tabular">−{moneyExact(order.refundedAmount)}</dd></div>}
                <div className="flex justify-between border-t border-line pt-2 text-[15px] font-bold"><dt>Total paid</dt><dd className="tabular">{moneyExact(order.total)}</dd></div>
                <p className="text-right text-xs text-ink-3">Includes VAT (margin scheme)</p>
              </dl>
            </div>
          </Card>

          <Card padded={false}>
            <CardHeader className="px-6 pb-0 pt-6" title="Timeline" subtitle="Everything that has happened to this order" />
            {manage && <form onSubmit={addNote} className="mx-6 mt-4 flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" className="input" />
              <Button type="submit" size="md" variant="secondary" disabled={!note.trim()} loading={busy}>Add</Button>
            </form>}
            <ol className="mt-2 px-6 pb-6">
              {[...order.events].reverse().map((e, i, arr) => {
                const Icon = EVENT_ICON[e.type];
                return (
                  <li key={e.id} className="relative flex gap-4 py-3">
                    {i < arr.length - 1 && <span className="absolute left-[15px] top-11 h-[calc(100%-26px)] w-px bg-line" />}
                    <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', EVENT_TONE[e.type])}><Icon size={14} /></span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className={cn('text-[13.5px]', e.type === 'note' ? 'rounded-2xl bg-tint-lemon/60 px-3 py-2 text-ink-2' : 'font-medium')}>{e.message}</p>
                      <p className="mt-1 text-xs text-ink-3">{formatDateTime(e.at)} · {e.by}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Customer" actions={manage && <IconButton label="Edit details" onClick={() => setEditing({ ...order.customer })}><Pencil size={15} /></IconButton>} />
            <Link to={`/customers/${encodeURIComponent(order.customer.email.toLowerCase())}`} className="text-[15px] font-bold hover:underline">{order.customer.firstName} {order.customer.lastName}</Link>
            <KeyValue className="mt-3" items={[['Email', <a href={`mailto:${order.customer.email}`} className="hover:underline">{order.customer.email}</a>], ['Phone', <a href={`tel:${order.customer.phone}`} className="hover:underline">{order.customer.phone}</a>]]} />
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-cream p-4 text-[13.5px]">
              <MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" />
              <address className="not-italic leading-relaxed">{addressLines.map((l) => <span key={l} className="block">{l}</span>)}</address>
            </div>
          </Card>

          <Card>
            <CardHeader title="Delivery" />
            <KeyValue items={[
              ['Method', DELIVERY_LABEL[order.delivery]],
              ['Estimated', closed ? '—' : formatDate(order.estimatedDelivery, { weekday: 'long', day: 'numeric', month: 'long' })],
              ['Carrier', order.tracking ? order.tracking.carrier : <span className="text-ink-3">Not yet dispatched</span>],
              ['Tracking', order.tracking ? (order.tracking.url ? <a href={order.tracking.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[12.5px] hover:underline">{order.tracking.number} <ExternalLink size={11} /></a> : <span className="font-mono text-[12.5px]">{order.tracking.number}</span>) : '—'],
            ]} />
            {manage && !order.tracking && !closed && <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setTracking({ carrier: 'Royal Mail Tracked 24', number: '' })}><Truck size={14} /> Add tracking</Button>}
          </Card>

          <Card>
            <CardHeader title="Payment" />
            <KeyValue items={[
              ['Method', <span className="inline-flex items-baseline font-display font-bold italic"><span className="text-[#003087]">Pay</span><span className="text-[#009cde]">Pal</span></span>],
              ['Reference', <span className="font-mono text-[12.5px]">{order.paymentRef}</span>],
              ['Status', <PaymentBadge status={order.paymentStatus} />],
              ['Captured', moneyExact(order.total)],
              ...(order.refundedAmount > 0 ? [['Refunded', <span className="text-brand-700">{moneyExact(order.refundedAmount)}</span>] as [string, ReactNode]] : []),
            ]} />
            {remaining > 0 && can('orders.refund') && <Button variant="danger" size="sm" className="mt-4 w-full" onClick={() => setRefund({ amount: String(remaining), reason: '' })}>Refund up to {money(remaining)}</Button>}
          </Card>

          <Card className="bg-cream-2">
            <p className="eyebrow mb-2">Status flow</p>
            <div className="flex flex-wrap gap-1.5">{(['confirmed', 'packing', 'dispatched', 'delivered'] as OrderStatus[]).map((s) => <Badge key={s} tone={s === order.status ? ORDER_TONE[s] : 'outline'}>{ORDER_STATUS_LABEL[s]}</Badge>)}</div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-3"><Clock size={12} className="mt-0.5 shrink-0" /> Updated {formatDateTime(order.updatedAt)}</p>
          </Card>
        </div>
      </div>

      <StatusModal order={order} status={statusTarget} open={!!statusTarget} onClose={() => setStatusTarget(null)} onSubmit={(c) => void changeStatus(c)} busy={busy} />

      <Modal open={!!refund} onClose={() => setRefund(null)} title="Refund to PayPal" subtitle={`Up to ${moneyExact(remaining)} can be refunded on this order.`} size="sm" footer={<><Button variant="ghost" size="sm" onClick={() => setRefund(null)}>Cancel</Button><Button variant="primary" size="sm" loading={busy} disabled={!refund || !refund.reason.trim() || !(Number(refund.amount) > 0)} onClick={async () => { if (!refund) return; const ok = await run(`Refunded ${money(Number(refund.amount))}`, () => api.refundOrder(order.orderNumber, Number(refund.amount), refund.reason.trim())); if (ok) setRefund(null); }}>Refund {refund && Number(refund.amount) > 0 ? money(Number(refund.amount)) : ''}</Button></>}>
        {refund && (
          <div className="space-y-4">
            <Field label="Amount" prefix="£" type="number" min={1} max={remaining} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} hint="Partial refunds keep the order open; a full refund marks it refunded." />
            <TextArea label="Reason" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} placeholder="e.g. Goodwill for late delivery" />
          </div>
        )}
      </Modal>

      <Modal open={!!tracking} onClose={() => setTracking(null)} title={order.tracking ? 'Edit tracking' : 'Add tracking'} size="sm" footer={<><Button variant="ghost" size="sm" onClick={() => setTracking(null)}>Cancel</Button><Button size="sm" loading={busy} disabled={!tracking?.number.trim()} onClick={async () => { if (!tracking) return; const ok = await run('Tracking saved', () => api.setOrderTracking(order.orderNumber, { ...tracking, number: tracking.number.trim(), url: trackingUrl(tracking.carrier, tracking.number.trim()) })); if (ok) setTracking(null); }}>Save</Button></>}>
        {tracking && (
          <div className="space-y-4">
            <Field label="Carrier" value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} list="carriers" />
            <datalist id="carriers">{['Royal Mail Tracked 24', 'Royal Mail Tracked 48', 'Royal Mail Special Delivery', 'DPD Next Day', 'Evri', 'UPS'].map((c) => <option key={c} value={c} />)}</datalist>
            <Field label="Tracking number" value={tracking.number} onChange={(e) => setTracking({ ...tracking, number: e.target.value })} autoFocus />
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit customer and delivery details" subtitle="Changes are recorded in the timeline. The customer is not emailed." footer={<><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={async () => { if (!editing) return; const ok = await run('Details updated', () => api.updateOrderCustomer(order.orderNumber, editing)); if (ok) setEditing(null); }}>Save</Button></>}>
        {editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} />
            <Field label="Last name" value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} />
            <Field label="Email" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <Field label="Phone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <Field label="Address line 1" className="sm:col-span-2" value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} />
            <Field label="Address line 2" className="sm:col-span-2" value={editing.line2 ?? ''} onChange={(e) => setEditing({ ...editing, line2: e.target.value || undefined })} />
            <Field label="City" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
            <Field label="Postcode" value={editing.postcode} onChange={(e) => setEditing({ ...editing, postcode: e.target.value.toUpperCase() })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
