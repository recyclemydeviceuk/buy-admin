import { useEffect, useState } from 'react';
import type { AdminOrder, OrderStatus, StatusChange } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Select, TextArea, Toggle } from '../ui/Field';
import { ORDER_STATUS_LABEL } from '../../lib/format';
import { Badge, ORDER_TONE } from '../ui/Badge';

const CARRIERS = ['Royal Mail Tracked 24', 'Royal Mail Tracked 48', 'Royal Mail Special Delivery', 'DPD Next Day', 'Evri', 'UPS'];
const TRACK_URL: Record<string, (n: string) => string> = {
  'Royal Mail Tracked 24': (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}`,
  'Royal Mail Tracked 48': (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}`,
  'Royal Mail Special Delivery': (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}`,
  'DPD Next Day': (n) => `https://track.dpd.co.uk/parcels/${n}`,
  Evri: (n) => `https://www.evri.com/track/parcel/${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
};

export function trackingUrl(carrier: string, n: string) {
  return TRACK_URL[carrier]?.(n);
}

export function StatusModal({ order, status, open, onClose, onSubmit, busy }: { order: AdminOrder; status: OrderStatus | null; open: boolean; onClose: () => void; onSubmit: (c: StatusChange) => void; busy?: boolean }) {
  const [carrier, setCarrier] = useState(order.tracking?.carrier ?? CARRIERS[0]);
  const [number, setNumber] = useState(order.tracking?.number ?? '');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  useEffect(() => {
    if (open) {
      setCarrier(order.tracking?.carrier ?? CARRIERS[0]);
      setNumber(order.tracking?.number ?? '');
      setNote('');
      setNotify(true);
    }
  }, [open, order]);
  if (!status) return null;
  const needsTracking = status === 'dispatched';
  const destructive = status === 'cancelled' || status === 'returned';
  const remaining = order.total - order.refundedAmount;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span className="flex items-center gap-2">Mark as <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge></span>}
      subtitle={`${order.orderNumber} · ${order.customer.firstName} ${order.customer.lastName}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant={destructive ? 'primary' : 'dark'} size="sm" loading={busy} disabled={needsTracking && !number.trim()} onClick={() => onSubmit({ status, note: note.trim() || undefined, notifyCustomer: notify, tracking: needsTracking && number.trim() ? { carrier, number: number.trim(), url: trackingUrl(carrier, number.trim()) } : undefined })}>
            {destructive ? `${ORDER_STATUS_LABEL[status]} and refund ${remaining > 0 ? `£${remaining}` : ''}` : `Mark ${ORDER_STATUS_LABEL[status].toLowerCase()}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {needsTracking && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)}>{CARRIERS.map((c) => <option key={c}>{c}</option>)}</Select>
            <Field label="Tracking number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. RM123456789GB" autoFocus />
          </div>
        )}
        {destructive && (
          <p className="rounded-2xl bg-tint-peach px-4 py-3 text-[13px] text-brand-700">
            {status === 'cancelled' ? 'Cancelling' : 'Marking as returned'} puts the {order.lines.length === 1 ? 'device' : 'devices'} back into stock{remaining > 0 ? ` and refunds the remaining £${remaining} to the customer's PayPal.` : '.'}
          </p>
        )}
        <TextArea label={destructive ? 'Reason' : 'Internal note (optional)'} value={note} onChange={(e) => setNote(e.target.value)} placeholder={destructive ? 'e.g. Customer changed their mind before dispatch' : 'Shown in the order timeline, not to the customer'} />
        {(status === 'dispatched' || status === 'delivered' || status === 'cancelled') && <Toggle checked={notify} onChange={setNotify} label="Email the customer" description={`Send the ${ORDER_STATUS_LABEL[status].toLowerCase()} email to ${order.customer.email}`} />}
      </div>
    </Modal>
  );
}
